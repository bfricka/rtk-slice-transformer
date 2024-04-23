import type {
	Action,
	Reducer,
	Slice,
	StoreEnhancerStoreCreator,
	UnknownAction,
} from '@reduxjs/toolkit'

type NameFromSlice<SL extends Slice> = SL extends Slice<any, any, infer N> ? N : never
type StateFromSlice<SL extends Slice> = SL extends Slice<infer S, any, any> ? S : never

export type ActionTransformer = (action: UnknownAction) => any

export type SliceTransformer<SL extends Slice, TS = any> = (state: StateFromSlice<SL>) => TS

export type CachedTransformer<State, TransformedState> = {
	readonly transformAction: ActionTransformer
	readonly transformState: (state: State | undefined) => TransformedState | undefined
}

export type CachedTransformerWithName<
	State,
	TransformedState,
	Name extends string,
> = CachedTransformer<State, TransformedState> & {
	readonly name: Name
}

export type CachedSliceTransformer<
	SL extends Slice,
	TransformedState = any,
> = CachedTransformerWithName<StateFromSlice<SL>, TransformedState, NameFromSlice<SL>>

type NameFromCachedSliceTransformer<T> =
	T extends CachedSliceTransformer<infer Slice> ? NameFromSlice<Slice> : never

type StateFromCachedSliceTransformer<T> =
	T extends CachedSliceTransformer<infer Slice> ? StateFromSlice<Slice> : never

type RootStateFromCachedSliceTransformers<S extends CachedSliceTransformer<any>[]> = {
	[P in keyof S as NameFromCachedSliceTransformer<S[P]>]: StateFromCachedSliceTransformer<S[P]>
}

type TransformedStateFromCachedSliceTransformer<T> =
	T extends CachedSliceTransformer<any, infer TS> ? TS : never

type TransformedStateFromCachedSliceTransformers<S extends CachedSliceTransformer<any>[]> = {
	[P in keyof S as NameFromCachedSliceTransformer<
		S[P]
	>]: TransformedStateFromCachedSliceTransformer<S[P]>
}

// By default, strip out thunks
const THUNK_ACTION_REGEXP = /\/(fulfilled|pending|rejected)$/

export const stripPayload = <T extends Action>(s: T) => ({ type: s.type })

export const DEFAULT_COMBINED_ACTION_TRANSFORMER: ActionTransformer = (a: UnknownAction) =>
	THUNK_ACTION_REGEXP.test(a.type) ? stripPayload(a) : a

const DEFAULT_SLICE_ACTION_TRANSFORMER: ActionTransformer = (a: UnknownAction) => a

/**
 * Create a transformer from a slice and a transform function. Also takes an
 * optional action transform function. Returns a cached slice transformer.
 *
 * @param slice Slice to transform
 * @param stateTransformer Function that takes in the slice state and returns transformed state
 * @param actionTransformer Optional function that transforms actions.
 */
export const createSliceTransformer = <
	SL extends Slice,
	State extends StateFromSlice<SL>,
	TransformedState = any,
>(
	slice: SL,
	stateTransformer: SliceTransformer<SL, TransformedState>,
	actionTransformer: ActionTransformer = DEFAULT_SLICE_ACTION_TRANSFORMER,
): CachedSliceTransformer<SL, TransformedState> => {
	let prevState: State = {} as any
	let transformedState: TransformedState = {} as any

	return {
		name: slice.name as NameFromSlice<SL>,
		transformAction: actionTransformer,
		transformState: (state: State | undefined) => {
			if (state == null) return state

			if (state !== prevState) {
				transformedState = stateTransformer(state)
				prevState = state
			}

			return transformedState
		},
	}
}

export const combineActionTransformers =
	<Transformers extends ActionTransformer[]>(transformers: Transformers) =>
	<A extends Action = UnknownAction>(action: A) => {
		let transformedAction: any = action

		for (const transformer of transformers) {
			// Return the transformed action when we get a value different from the original action
			if ((transformedAction = transformer(transformedAction)) !== action) return transformedAction
		}

		return transformedAction
	}

export const combineTransformers = <
	Transformers extends CachedTransformerWithName<any, any, any>[],
	State extends RootStateFromCachedSliceTransformers<Transformers>,
	TransformedState extends TransformedStateFromCachedSliceTransformers<Transformers>,
>(
	transformers: Transformers,
	actionTransformer: ActionTransformer = DEFAULT_COMBINED_ACTION_TRANSFORMER,
): CachedTransformer<State, TransformedState> => {
	let prevState: State = {} as any
	let transformedState: TransformedState = {} as any

	return {
		transformAction: combineActionTransformers([
			actionTransformer,
			...transformers.map((t) => t.transformAction),
		]),

		transformState: (state: State | undefined) => {
			if (!state) return state

			if (state !== prevState) {
				transformedState = transformers.reduce((ts, transformObj) => {
					const sliceName = transformObj.name as keyof State & keyof TransformedState
					ts[sliceName] = transformObj.transformState(state[sliceName])
					return ts
				}, {} as TransformedState)

				prevState = state
			}

			return transformedState
		},
	}
}

export const createReduxTransformer =
	<T extends CachedTransformer<any, any>>(
		transformer: T,
		sideEffectsCb: (
			transformedAction: ReturnType<T['transformAction']>,
			transformedState: ReturnType<T['transformState']>,
		) => void,
		onError?: (e: unknown) => void,
	) =>
	(next: StoreEnhancerStoreCreator): StoreEnhancerStoreCreator =>
	<S = any, A extends Action = UnknownAction>(reducer: Reducer<S, A>, preloadedState?: any) => {
		const transformSideEffectsReducer: Reducer<S, A> = (s, a) => {
			const newState = reducer(s, a)

			try {
				const transformedAction = transformer.transformAction(a)
				const transformedState = transformer.transformState(newState)

				sideEffectsCb(transformedAction, transformedState)
			} catch (e) {
				onError?.(e)
			}

			return newState
		}

		return next(transformSideEffectsReducer, preloadedState)
	}
