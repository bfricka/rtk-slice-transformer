![npm](https://img.shields.io/npm/v/rtk-slice-transformer?style=flat-square)
![npm](https://img.shields.io/npm/l/rtk-slice-transformer?style=flat-square)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/rtk-slice-transformer?style=flat-square)
# rtk-slice-transformer

This package creates a simplified interface for transforming a slice, or slices, as well as any
associated actions, and then performing side effects on the transformed output via an enhancer. The
main point is simplicity, but we also keep previous state in memory to avoid having to call every
transformer on every single `dispatch`. If holding a reference to previous state in memory is
problematic for you, please do not use this.

Use cases for this functionality might include tools like
[Sentry](https://github.com/getsentry/sentry-javascript), or other analytics, where you want to
shoot off breadcrumbs or state, but need to strip out Personally Identifiable Information (PII) or
other sensitive data.

## Requirements

- TypeScript 4.1+ (if you use TypeScript)
- @reduxjs/toolkit 1.7+

Types currently use new TypeScript (currently 4.5), but may be compatible with older versions. Open
an issue if you're having trouble. You'll at least need support for mapped types with key remapping
(TS 4.1).

## Installation

`yarn add rtk-slice-transformer`

## Usage

`rtk-slice-transformer` exports a few functions that can be used alone or in combination to help
simplify transformations. Below is a straightforward example of how you might structure this.

#### Example

```ts
// example.slice.ts
import { createSliceTransformer, stripPayload } from 'rtk-slice-transformer'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type ExampleState = { readonly foo: string; readonly sensitive: number | null }
const initialState: ExampleState = { foo: '', sensitive: null }
export const exampleSlice = createSlice({
	name: 'example',
	initialState,
	reducers: {
		setFoo(s, a: PayloadAction<string>) {
			s.foo = a.payload
		},
		setSensitive(s, a: PayloadAction<number | null>) {
			s.sensitive = a.payload
		},
	},
})

export const { setFoo, setSentitive } = exampleSlice.actions

export const exampleTransformer = createSliceTransformer(
	exampleSlice,
	// Use some sanitizer function to clean the sensitive state
	(exampleState) => ({
		...exampleState,
		sentitive: sanitizeSensitiveSomehow(exampleState.sentitive),
	}),
	// Stripe sensitive payload from sensitive actions. Otherwise, just return the action.
	(action) => (setSentitive.match(action) ? stripPayload(action) : action),
)
```

```ts
// store.ts
import { combineTransformers, createReduxTransformer } from 'rtk-slice-transformer'
import { exampleTransformer } from './example.slice'
import { configureStore } from '@reduxjs/toolkit'

const stateTransformer = combineTransformers([exampleTransformer /*...additionalTransformers*/])

export const store = configureStore({
	// reducer, preloadedState, etc...
	enhancers: [
		createReduxTransformer(stateTransformer, (transformedAction, transformedState) => {
			// Do something with transformed stuff
		}),
	],
})
```

### `createSliceTransformer(slice, stateTransformer, actionTransformer?)`

Pass in the slice as well as a `stateTransformer` function. `stateTransformer` will be passed the
slice state, and you should return the transformed state from it.

You can also pass an `actionTransformer`. This function is not tied to the slice explicitly, and it
may receive any action. However, it is often convenient to define this logic in the same place as
other slice-related code, and this API will copy it to the output of `createSliceTransformer`.

### `combineTransformers(transformers, actionTransformer? = DEFAULT_COMBINED_ACTION_TRANSFORMER)`

A list of transformers and combines them into a single transformer. Currently, the returned result
is different from the result of `createSliceTransformer`, since it doesn't include the slice name.
If desirable, we could allow `combineTransformers` to accept a name, and thus return a type that
allows arbitrary levels of combination. Open a PR if you need this. Currently, you could do the same
thing, but you'd have to add a name to the output and coerce the type.

Additionally, `combineTransformers` may take an optional `actionTransformer` that acts on the global
actions. The default combined transformer will strip the payload from any RTK thunk types
(`fulfilled|pending|rejected`), since these are likely to contain a significant amount of unwanted
data. If you want RTK actions, simply pass an identity function:
`combineTransformers(transformers, (action) => action)`.

#### NOTE ABOUT ACTION TRANSFORMERS:

Action transformers are called one after another until a transformer returns something that does not
strictly equal the original action. Thus, the first transformer that does a transformation on an
action "wins", and the rest are ignored. An obvious consequence of this is that, if you don't want
to transform an action, you _must_ return the original action. We currently do not check for
`undefined`, so if you return nothing, the action will be transformed to `undefined`. If there's a
good reason to consider `undefined` as "not transformed", we could make that distinction, but
currently we don't.

### `createReduxTransformer(transformer, sideEffectsCb, onError?)`

A dead simple enhancer creator that takes in the combined transformer for the state, a side effects
callback, and an optional error handler.

`sideEffectsCb` takes the form `sideEffectsCb(transformedAction, transformedState)`, and you can use
this to do whatever you want with these values. Note, that if the action or state is _not_
transformed (i.e. it's the original action or state), you'll have to abide the same immutable
constraints as with any redux action or state. Probably best to treat these as immutable.

The optional `onError` handler can be passed in case any of the transformers throw.

### `stripPayload(action)`

A helper for the common task of stripping the payload from an action.

### `combineActionTransformers(transformers)`

A helper used by `combineTransformers`. Takes in a list of transformers and returns a single
transformer. This is useful if you want to break up your action transformers into multiple functions
and then pass the combined result to `createSliceTransformer` or `combineTransformers`. E.g. if you
still want to filter RTK thunk actions, but want to add something of your own:

```ts
import {
	combineActionTransformers,
	DEFAULT_COMBINED_ACTION_TRANSFORMER,
} from 'rtk-slice-transformer'

const rootActionTransformer = combineActionTransformers([
	DEFAULT_COMBINED_ACTION_TRANSFORMER,
	mySpecialRootTransformer,
])
```
All the same caveats apply as [mentioned above](#note-about-action-transformers).
