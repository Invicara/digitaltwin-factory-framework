import {
    clearEntities,
    getAllCurrentEntities,
    getAppliedFilters,
    getCurrentEntityType,
    getFetchingCurrent,
    getIsolatedEntities,
    getSelectedEntities,
    isSelectingEntities,
    isViewerSyncOn,
    selectEntitiesFromModels,
    setEntities,
    setIsolatedEntities,
    setSelectedEntities,
    setViewerSyncOn,
    getSnapshot,
    getFilteredEntities,
    getAppliedGroups,
    fetchEntities,
    resetEntities,
    setCurrentEntityType,
    resetForFilteringAndGrouping,
    applyFiltering,
    applyGrouping,
    resetFiltering,
    setSelecting
} from "./slices/entities";

import * as modal from './slices/modal'


import {getUser, setUser} from './slices/user'
import {
    applySearchFiltering,
    clearSearchedEntities,
    getAllCurrentSearchedEntities,
    getAppliedSearchFilters,
    getCurrentSearchEntityType,
    getSearchingCurrent,
    getSelectedSearchedEntities,
    resetSearchedEntities,
    searchEntities,
    setSelectedSearchedEntities
} from "./slices/entities-pluggable-search";
import {getEntitySelectConfig, setUserConfig} from "./slices/user-config";
import {
    fetchAssocitedFileSvcData,
    fetchAllNamedUserItems, fetchNamedUserItemItems,
    namedUserItemActions, selectNamedUserItemById,
    selectNamedUserItemEntities, selectNamedUserItemsLoadingStatus,
    fetchNamedUserTotalAmountOfItems, importDataValidation, 
    SelectNamedUserItemsErrorStatus, fileImport, SelectNamedUserItemsImportStatus
} from "./slices/named-user-item.slice";
import { addEntityComponents, getEntityDataComponent } from "./slices/entityUI"
import store  from '../redux/store'

const redux = {
    Entities: { 
        getFilteredEntities,
        getAppliedGroups,
        fetchEntities,
        resetEntities,
        setCurrentEntityType,
        getCurrentEntityType,
        getIsolatedEntities,
        getSelectedEntities,
        isViewerSyncOn,
        selectEntitiesFromModels,
        clearEntities,
        getAllCurrentEntities,
        getAppliedFilters,
        getFetchingCurrent,
        isSelectingEntities,
        setEntities,
        setIsolatedEntities,
        setSelectedEntities,
        setViewerSyncOn,
        getSnapshot,
        resetForFilteringAndGrouping,
        applyFiltering,
        applyGrouping,
        resetFiltering,
        setSelecting
    },
    EntitiesPluggableSearch: {
        getAllCurrentSearchedEntities,
        getSelectedSearchedEntities,
        getSearchingCurrent,
        getCurrentSearchEntityType,
        getAppliedSearchFilters,
        resetSearchedEntities,
        clearSearchedEntities,
        applySearchFiltering,
        setSelectedSearchedEntities,
        searchEntities
    },
    User: {
        getUser,
        setUser,
        setUserConfig,
        getEntitySelectConfig
    },
    Modals: {
        ...modal.actions
    },
    NamedUserItems: {
        fetchAssocitedFileSvcData,
        fetchAllNamedUserItems,
        fetchNamedUserItemItems,
        selectNamedUserItemEntities,
        selectNamedUserItemsLoadingStatus,
        selectNamedUserItemById,
        SelectNamedUserItemsErrorStatus,
        SelectNamedUserItemsImportStatus,
        ...namedUserItemActions,
        fetchNamedUserTotalAmountOfItems,
        importDataValidation,
        fileImport
    }, 
    EntityUi: {
        addEntityComponents,
        getEntityDataComponent
    },
    store: store
}

export default redux
export const Entities = {
    getFilteredEntities,
    getAppliedGroups,
    fetchEntities,
    resetEntities,
    setCurrentEntityType,
    getCurrentEntityType,
    getIsolatedEntities,
    getSelectedEntities,
    isViewerSyncOn,
    selectEntitiesFromModels,
    clearEntities,
    getAllCurrentEntities,
    getAppliedFilters,
    getFetchingCurrent,
    isSelectingEntities,
    setEntities,
    setIsolatedEntities,
    setSelectedEntities,
    setViewerSyncOn,
    getSnapshot,
    resetForFilteringAndGrouping,
    applyFiltering,
    applyGrouping,
    resetFiltering,
    setSelecting
}
export const EntitiesPluggableSearch = {
    getAllCurrentSearchedEntities,
    getSelectedSearchedEntities,
    getSearchingCurrent,
    getCurrentSearchEntityType,
    getAppliedSearchFilters,
    resetSearchedEntities,
    clearSearchedEntities,
    applySearchFiltering,
    setSelectedSearchedEntities,
    searchEntities
}
export const User = {
    getUser,
    setUser,
    setUserConfig,
    getEntitySelectConfig
}
export const Modals = {
    ...modal.actions
}
export const NamedUserItems = {
    fetchAssocitedFileSvcData,
    fetchAllNamedUserItems,
    fetchNamedUserItemItems,
    selectNamedUserItemEntities,
    selectNamedUserItemsLoadingStatus,
    selectNamedUserItemById,
    SelectNamedUserItemsErrorStatus,
    SelectNamedUserItemsImportStatus,
    ...namedUserItemActions,
    fetchNamedUserTotalAmountOfItems,
    importDataValidation,
    fileImport
}
export const EntityUi = {
    addEntityComponents,
    getEntityDataComponent
}
export {store}
