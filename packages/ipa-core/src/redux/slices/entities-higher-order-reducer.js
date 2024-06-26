import {createSelector, createSlice} from '@reduxjs/toolkit'
import {setIncludesBy} from "../../IpaUtils/compare";
import _ from "lodash";
import {getEntityFromModel, getFilteredEntitiesBy} from "../../IpaUtils/entities";
import ScriptCache from "../../IpaUtils/script-cache";
import {ControlProvider} from "../../IpaControls/ControlProvider";


let initialState = {//TODO if operations on these entities get too slow, use direct access instead of an array
    /**
     * note: currentEntityType is current handler config, must have minimum the following properties:
     * {script, entityFromModelScript, spaceMode, selectors, data, singular, plural}
     */
    currentEntityType: null,
    fetchingCurrent: 0,
    appliedFilters: {},
    appliedGroups: [],
    selectingEntities: false,
    viewerSyncOn: false,
    allCurrent: [],
    selectedIds: [],
    isolatedIds: []
};

let currentFetchPromise = new Promise(res => res([]))

const mapIds = entities => entities.map(({_id}) => _id)

export const entitiesSliceFactory = (identifier = '') => {
    const sliceName = `entities${identifier}`
    const slice = createSlice({
        name: sliceName,
        initialState,
        reducers: {
            setEntities: (state, {payload: {entities, shouldIsolate = true}}) => {
                state.allCurrent = entities;
                //Whenever we fetch entities we want to isolate them unless specified otherwise.
                //Maybe this will change over time as requirements get more specific
                state.isolatedIds = shouldIsolate ? mapIds(entities) : []
            },
            setIsolatedEntities: (state, {payload: entities}) => {
                state.isolatedIds = mapIds(entities)
            },
            setSelectedEntities: (state, {payload: entities}) => {
                state.selectedIds = mapIds(entities)
            },
            applyFiltering: (state, {payload: filters}) => {
                state.appliedFilters = filters
            },
            resetFiltering: (state) => {
                state.appliedFilters = initialState.appliedFilters
            },
            applyGrouping: (state, {payload: groups}) => {
                state.appliedGroups = groups
            },
            resetGrouping: (state) => {
                state.appliedGroups = initialState.appliedGroups
            },
            resetForFilteringAndGrouping: (state, {payload: {groups, filters}}) => {
                state.appliedFilters = filters ? filters : state.appliedFilters
                state.appliedGroups = groups ? groups : state.appliedGroups
                state.selectedIds = _.isEmpty(state.selectedIds) ? state.selectedIds : []
            },
            setFetching: (state, {payload: fetching}) => {
                if(fetching){
                    state.fetchingCurrent++;
                } else {
                    state.fetchingCurrent--;
                }
            },
            setSelecting: (state, {payload: selecting}) => {
                state.selectingEntities = selecting
            },
            setCurrentEntityType: (state, {payload: type}) => {
                state.currentEntityType = type
            },
            setViewerSyncOn: (state) => {
                state.viewerSyncOn = true
            },
            resetEntities: () => initialState,
            deleteEntity: (state, {payload: entity}) => {
                state.allCurrent.splice(state.allCurrent.findIndex(e => e._id === entity._id), 1)
            },
            addEntity: (state, {payload: entity}) => {
                state.allCurrent.push(entity)
            },
            updateEntity: (state, {payload: {_id, ...updates}}) => {
                const toUpdate = state.allCurrent.find(e => e._id === _id)
                _.assign(toUpdate, updates, {lastUpdate: Date.now()})
            },
            sortByName: (state) => {
                state.allCurrent.sort((a, b) => a["Entity Name"].localeCompare(b["Entity Name"]))
            },
            clearEntities: (state) => {
                state.allCurrent = [];
                state.appliedFilters = {}
                state.appliedGroups = []
                state.selectedIds = [];
                state.isolatedIds = []
            },
            clearForNewEntityType: (state,{payload: type}) => {
                state.allCurrent = [];
                state.appliedFilters = {}
                state.appliedGroups = []
                state.selectedIds = [];
                state.isolatedIds = [];
                state.currentEntityType = type
            },
            loadSnapshot : (state,{payload: snapshot}) => {
                state.allCurrent = snapshot.allCurrent;
                state.appliedFilters = snapshot.appliedFilters;
                state.appliedGroups = snapshot.appliedGroups;
                state.selectedIds = snapshot.selectedIds;
                state.isolatedIds = snapshot.isolatedIds;
                state.currentEntityType = snapshot.currentEntityType;
                state.fetchingCurrent = snapshot.fetchingCurrent;
                state.selectingEntities = snapshot.selectingEntities;
                state.viewerSyncOn = snapshot.viewerSyncOn;//TODO: ?? this could be a global value?
            }
        },
    });

    const { actions, reducer } = slice;

    const actionCreators = actions;

    //Action creators
    const {
        setEntities, setFetching, resetEntities, setViewerSyncOn, setIsolatedEntities, setSelectedEntities, setCurrentEntityType, setSelecting,
        applyFiltering, resetFiltering, applyGrouping, resetGrouping, resetForFilteringAndGrouping,
        addEntity, deleteEntity, updateEntity, clearEntities, loadSnapshot, clearForNewEntityType
    } = actionCreators

    //Private selectors
    const getEntitiesSlice = store => store[sliceName]

    const getSnapshot = createSelector(getEntitiesSlice, entitiesSlice => entitiesSlice || {});

    const getIsolatedEntitiesIds = createSelector(getEntitiesSlice, entitiesSlice => entitiesSlice.isolatedIds || [])

    const getSelectedEntitiesIds = createSelector(getEntitiesSlice, entitiesSlice => entitiesSlice.selectedIds || [])

    const fromIDs = (entities, ids) => entities.filter(e => _.includes(ids, e._id))

    //Public Selectors
    const getAllCurrentEntities = createSelector(getEntitiesSlice, entitiesSlice => entitiesSlice.allCurrent)

    const getAppliedFilters = createSelector(getEntitiesSlice, entitiesSlice => entitiesSlice.appliedFilters)

    const getAppliedGroups = createSelector(getEntitiesSlice, entitiesSlice => entitiesSlice.appliedGroups)

    const getFilteredEntities = createSelector([getAllCurrentEntities, getAppliedFilters], (currentEntities, appliedFilters) =>
        _.isEmpty(getAppliedFilters) ? currentEntities : getFilteredEntitiesBy(currentEntities, appliedFilters)
    )

    const getIsolatedEntities = createSelector([getFilteredEntities, getIsolatedEntitiesIds], fromIDs)

    const getSelectedEntities = createSelector([getFilteredEntities, getSelectedEntitiesIds], fromIDs)

    const getFetchingCurrent = createSelector(getEntitiesSlice, entitiesSlice => !!entitiesSlice.fetchingCurrent)

    const isViewerSyncOn = createSelector(getEntitiesSlice, entitiesSlice => entitiesSlice.viewerSyncOn)

    const isSelectingEntities = createSelector(getEntitiesSlice, entitiesSlice => entitiesSlice.selectingEntities)

    const getCurrentEntityType = createSelector(getEntitiesSlice, entitiesSlice => entitiesSlice.currentEntityType)

    const selectors = {
        getAllCurrentEntities, getAppliedFilters, getAppliedGroups, getFilteredEntities, getIsolatedEntities, getSelectedEntities,
        getFetchingCurrent, isViewerSyncOn, isSelectingEntities, getCurrentEntityType, getSnapshot
    }

    //Thunks
    const selectEntitiesFromModels = (modelEntities) => async (dispatch, getState) => {
        try {
            if (modelEntities.length === 1) dispatch(setSelecting(true))
            const {entityFromModelScript} = getCurrentEntityType(getState());
            const entitiesToSelect = await Promise.all(modelEntities.map(modelEntity => {
                const foundEntity = getAllCurrentEntities(getState()).find(e => modelEntity.id === e.modelViewerIds[0])
                return !_.isEmpty(foundEntity)  ? new Promise((resolve)=>resolve(foundEntity)) : getEntityFromModel(entityFromModelScript, modelEntity)
            }));

            const filteredToSelect = entitiesToSelect.filter(e => e)
            if (!setIncludesBy(getAllCurrentEntities(getState()), filteredToSelect, (e) => (e?.modelData?.id || e?._id))) {
                dispatch(setEntities({entities: filteredToSelect, shouldIsolate: false}))
            }
            dispatch(setSelectedEntities(filteredToSelect))
            dispatch(setSelecting(false))
        } catch (e) {
            console.error("There was an error selecting the model entity:", e)
        }
    };

    const changeEntity = (changeType, entity) => async (dispatch, getState) => {
        const defaultChangeHandler = () => console.warn('Tried to edt entity with an unknown change type') //TODO Revisit if not doing anything is ok or we should be throwing an error.
        const entityChanges = {
            create: (entity) => dispatch(addEntity(entity)),
            edit: (entity) => dispatch(updateEntity(entity)),
            delete: (entity) => dispatch(deleteEntity(entity)),
            relate: (entity) => dispatch(updateEntity(entity))
        };
        (entityChanges[changeType] || defaultChangeHandler)(entity)
    }

    const fetchEntities = (script, selector, value, runScriptOptions) => async (dispatch, getState) => {
        const query = ControlProvider.getQuery(value, selector);
        dispatch(setFetching(true));

        const interceptFetchError = function(errorResult){
            console.error("Fetch failed",errorResult);
        }

        const getNextFetchPromise = () =>
            query ?
                ScriptCache.runScript(selector.altScript ? selector.altScript : script, {entityInfo: selector.altScript ? value : query}, runScriptOptions)
                : new Promise(res => res([]));
        currentFetchPromise = currentFetchPromise.then(
            () => getNextFetchPromise(),
            //ABOVE might return rejected promise, and chaining another .then is not possible without error handler resetting the promise status
            (errorResult) => { interceptFetchError(errorResult); return getNextFetchPromise();}
        )
        let entities = await currentFetchPromise;
        const sorted = _.sortBy(entities, a => a["Entity Name"]);
        dispatch(setEntities({entities: sorted}));
        dispatch(setSelectedEntities([]));
        // We do this to wait for the next tick thus allowing react to render the loading page-in between.
        // Otherwise when retrieving cached data it might happen so quickly that the loading page does not render and
        // the user has a few milliseconds while the page with updated data renders to execute a navigate action with stale data.
        // The real fix for this would be addressing the slow-render of the page, not a priority now.
        setTimeout( () => dispatch(setFetching(false)), 0)
    }

    const thunks = {
        selectEntitiesFromModels, changeEntity, fetchEntities
    }

    return {reducer, actionCreators, selectors, thunks}
}

//Other
const asOptional = (object, path) => _.isEmpty(_.get(object, path)) ? [] : [object];



