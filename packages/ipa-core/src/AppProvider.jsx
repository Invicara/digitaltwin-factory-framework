import React from 'react';
import * as PropTypes from 'prop-types';
import {Route, Redirect} from 'react-router-dom';
import _ from "lodash";

import {IafSession, IafProj, IafDataSource} from '@dtplatform/platform-api';
import {IafScriptEngine} from "@dtplatform/iaf-script-engine";

import EmptyConfig, {actualPage} from './emptyConfig';

import DefaultStyleVars from "./IpaStyles/styleVars.json";

import ProjectPickerModal from "./IpaDialogs/ProjectPickerModal";
import ScriptHelper from './IpaUtils/ScriptHelper'

import {parseQuery} from "./IpaUtils/helpers";

import {addUserConfig} from "./redux/slices/user-config";
import {addUser} from "./redux/slices/user";

import ScriptCache from './IpaUtils/script-cache'
import store, { addReducerSlice } from './redux/store'
import { addDashboardComponents } from './redux/slices/dashboardUI'
import { addEntityComponents } from './redux/slices/entityUI'
import SetUpProject from "./ipaProjectSetup/SetupProject";
import withGenericPage from './IpaPageComponents/GenericPage'
import InternalPages from './IpaPageComponents/InternalPages'
import withGenericPageErrorBoundary from "./IpaPageComponents/GenericPageErrorBoundary";
import {AppContext, withAppContext} from "./appContext";
import withAuthHoc from './withAuthHoc';

class AppProvider extends React.Component {
  constructor(props) {
    super(props);

    IafSession.setConfig(endPointConfig);

    //this is a workaround for a platform issue
    //platform needs the url to have a forward slash prior to the ? for query params
    //so if the baseroot does not already have one we add it here
    let authRoot = endPointConfig ? endPointConfig.baseRoot : this.props.ipaConfig.endPointConfig.baseRoot
    if (authRoot.slice(-1) !== '/') authRoot = authRoot + '/'


    let appId = endPointConfig?.applicationId ? endPointConfig.applicationId : this.props.ipaConfig?.applicationId
    if (!appId) console.error('Application ID missing from endPointConfig or ipaConfig')

    this.authUrl = IafSession.getAuthUrl(authRoot, appId);

    this.isSigningOut = false;
    this.defaultBottomPanelHeight = 350;
    this.state = {
      isshowProjectPickerModal: false,
      userConfig: this.props.initialConfig || EmptyConfig,
      user: undefined,
      token: undefined,
      isAuthorized: false,
      isLoading: true,
      loadingText: 'Loading..',
      showBottomPanel: false,
      viewerResizeCanvas: false,
      bottomPanelHeight: this.defaultBottomPanelHeight,
      defaultBottomPanelHeight: this.defaultBottomPanelHeight,
      maxBottomPanelHeight: window.innerHeight - 80,
      router: {
        pageList: [],
        pageRoutes: [],
        pageGroups: []
      },
      selectedItems: localStorage[`ipadt_selectedItems${appId}`]
          ? JSON.parse(localStorage[`ipadt_selectedItems${appId}`])
          : {},
      actions: {
        reloadConfig: this.initialize.bind(this, false),
        restartApp: this.initialize.bind(this),
        setSelectedItems: this.setSelectedItems.bind(this),
        userLogout: this.userLogout.bind(this),
        closeBottomPanel: this.closeBottomPanel.bind(this),
        showBottomPanel: this.showBottomPanel.bind(this),
        toggleBottomPanel: this.toggleBottomPanel.bind(this),
        openBottomPanelMax: this.openBottomPanelMax.bind(this),
        getCurrentHandler: this.getCurrentHandler.bind(this),
        showModal: this.showIpaModal.bind(this),
        handlePageHandlerLoadError:  this.handlePageHandlerLoadError.bind(this),
      }
    };

    this.handleRequestError = this.handleRequestError.bind(this);
    this.testConfig = this.testConfig.bind(this);
    this.onConfigLoad = this.onConfigLoad.bind(this);
    this.sisenseLogout = this.sisenseLogout.bind(this);
  }

  componentDidMount() {
    IafSession.setErrorCallback(this.handleRequestError);
    this.state.actions.restartApp();
  }
  handleClick() {
    this.setState((prev) => {
      return { ...prev, isshowProjectPickerModal: true };
    });
  }

  async sisenseLogout() {
    let sisUrl = sessionStorage.getItem('sisenseBaseUrl')

    if (sisUrl) {
      let sisenselogout_url = sisUrl + "/api/auth/logout"
      fetch(sisenselogout_url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        redirect: 'manual',
        credentials: 'include'
      }).catch((err) => {
        console.error("ERROR LOGGING OUT OF SISENSE: " + sisenselogout_url)
        console.error(err)
      })
      delete sessionStorage.sisenseBaseUrl
    }
  }

  async userLogout() {
    try {
      await IafSession.logout();
    } catch (e) {console.error("An unexpected error happened while logging out.")}

    this.sisenseLogout()

    // delete cached config
    delete sessionStorage.ipadt_configData;
    delete localStorage.ipadt_selectedItems;
    window.location = this.authUrl;
  }

  closeBottomPanel() {

    let modelPopupContainerStyle = document.querySelector('div.asf-modal.threeDModelPopup').style;
    let opacityValue = 1;
    let intervalObj = setInterval(() => {
      if (opacityValue != 0) {
        opacityValue = (opacityValue - 0.1).toFixed(2);
        modelPopupContainerStyle.opacity = opacityValue;
      } else {
        clearInterval(intervalObj);
      }
    }, 50);
    setTimeout(() => {
      this.setState({show3DModelPopUp: false});
      modelPopupContainerStyle.opacity = 1;
    }, 600);

  }

  showBottomPanel() {
    this.context.ifefSnapper.open('bottom');
    document.getElementById('BottomPanel').style.display = 'block';
  }

  openBottomPanelMax() {
    this.context.ifefSnapper.open('bottom');
    let viewer = document.getElementById('BottomPanel');
    viewer.style.display = 'block';
    viewer.style.height = window.innerHeight - 80;
    this.setState({viewerResizeCanvas: true})

    let toolbar = document.getElementsByClassName('model-viewer-toolbar');
    toolbar[0].style.display = 'none';
  }

  toggleBottomPanel() {
    // the following should probably be in ifefSnaper.toggle?
    let body = document.querySelector('body')
    let wasOpen = body.classList.contains('snapjs-bottom')
    // end

    document.getElementById('BottomPanel').style.display = wasOpen
        ? 'none'
        : 'block';
    document.getElementById('BottomPanel').style.height = this.defaultBottomPanelHeight;

    this.context.ifefSnapper.toggle('bottom');

    // the following should probably be in ifefSnaper.toggle?
    if (wasOpen) {
      body.classList.remove('snapjs-bottom');
      this.setState({viewerResizeCanvas: false})
    }

    // end

    //make sure we always show the toolbar in case open3DModelPopupMax above hide it
    let toolbar = document.getElementsByClassName('model-viewer-toolbar');
    toolbar[0].style.display = 'block';
  }

  setSelectedItems(newItems) {
    const {selectedItems} = this.state;
    //save items to session
    let newSelecteds = Object.assign(selectedItems, newItems);
    localStorage[`ipadt_selectedItems${this.props.ipaConfig.applicationId}`] = JSON.stringify(newSelecteds);
    this.setState({selectedItems: newSelecteds});
  }
  getPageArray(){return window.location.href.split('?')[0].split('/')}

  getCurrentHandler() {
    let config = this.state.userConfig;
    let _pageArray = this.getPageArray();
    //location will be:  pathPrefix ? (pathPrefix + handler.path) : (handler.path || '/' + handlerName)
    //where handlerName comes from page.handler - but it will not be used it handler.path is specified
    let page = _pageArray.pop();
    if (page === "")
      page = _pageArray.pop();
    let handler = null;
    let pageNames = config.pages ? Object.keys(config.pages) : Object.keys(config.groupedPages);
    let pagesConfig = config.pages || config.groupedPages;
    let pagesHavePositions = pagesConfig[pageNames[0]].position;

    if (page.endsWith('#') && config.homepage && config.homepage.handler) {
      handler = config.handlers[config.homepage.handler];
    }
    else if (page.endsWith('#')){
      if (!pagesHavePositions)
        handler = config.handlers[actualPage(config, pageNames[0]).handler];
      else {
        let lowestPos = pagesConfig[pageNames[0]].position;
        let lowestHandler = actualPage(config, pageNames[0]).handler;
        pageNames.forEach((pn) => {
          if (pagesConfig[pn].position < lowestPos) {
            lowestPos = pagesConfig[pn].position;
            lowestHandler = actualPage(config, pn).handler;
          }
        })
        handler = config.handlers[lowestHandler];
      }

    }

    /*
     * Removed this code because I wasn't sure why try to go through the pages first to get the handler
     * instead of just goign straight to the handlers like we do below. Plus I think this commented code
     * relies on the name of the handler matchign the path of the handler, which is nto always guaranteed
     * to be true - scott mollon 12/4/2020
     * DOMI SEPT 2022 - keep this code and activate as it is useful for MemoryRouter and other routers that do not produce HashRouter hrefs
     */
    //look for handler in page list
    // const pageGroup = config.groupedPages ? Object.entries(config.groupedPages).find(p => p[1].pages.some(e => e[page] !== undefined)) : undefined;
    // if (config.pages && config.pages[page] || pageGroup){
    //   handler = config.pages ? config.handlers[config.pages[page].handler] : config.handlers[pageGroup.pages[page].handler] ;
    // }


    //if the handler is not found in the page list
    //look for it in the list of handlers
    //this might be necessary for pages that appear in action handlers
    //but not the page list
    if (!handler) {
      const requestPathAsArray = this.getPageArray();
      const lastButOnePathElement = requestPathAsArray[requestPathAsArray.length - 2]; //For detail components where the last element is the pathParam
      const allHandlers = Object.values(config.handlers);
      handler = allHandlers.find( h => h.path === `/${page}` || h.path === `/${lastButOnePathElement}`);
    }
    
    return handler;
  }

  handlePageHandlerLoadError(error) {
    throw error;
  }

  // Updated handleRequestError with a condition if authType is pkce then using refresh token generate a new access token
  async handleRequestError(error) {
    console.error(error)
    let requiredAuthenticationErrorMessage = "401: Full authentication is required to access this resource";
    if (_.get(error,'errorResult.status') === 401) {
      if (!this.isSigningOut) {
        this.isSigningOut = true;
        if (endPointConfig.authType === 'implicit') {           //If authType is implicit it user will logout
          this.state.actions.userLogout();
        } else if (endPointConfig.authType === 'pkce') {        //If authType is pkce, fetch auth token
          if (error.message == requiredAuthenticationErrorMessage) {
            this.state.actions.userLogout();
            return
          }
          const tokens = await this.props.authService.getAuthTokens();
          const refreshToken = tokens && Object.keys(tokens).length > 0 ? tokens.refresh_token : '';
          if (refreshToken) {
            let updatedToken = await this.props.authService.fetchToken(refreshToken, true);   //Fetch new token using refresh token
            if (updatedToken) {
              let user = await IafSession.setAuthToken(updatedToken.access_token,undefined);    //Updated token in session storage
              this.setState({token: updatedToken.access_token})         //Set updated token 
            }
          }
        }
      }
    }
  }

  async initialize(loadConfigFromCache = true, showProjectPicker = true) {
    const self = this;

    let sessionManage = sessionStorage.getItem('manage');

    if (sessionManage) {
      sessionManage = JSON.parse(sessionManage);
    }

    let token, user;
    let inviteId;

    const auth_token = this.props.authService.getAuthTokens();

    if (auth_token && Object.keys(auth_token).length !== 0) {
      sessionManage = auth_token;
    }

    if (sessionManage && Object.keys(sessionManage).length === 0) {
      sessionManage = undefined;
    }

    if (this.props.authService.isPending()) {
      return;
    }

    store.dispatch({type: "PROJECT_SWITCHED"})

    //check for invites. If so - redirect to signup
    if (window.location.search) {
      const parsed = parseQuery(window.location.search);
      if (Object.prototype.hasOwnProperty.call(parsed, 'inviteId')) {
        inviteId = parsed.inviteId;
      } else if (Object.prototype.hasOwnProperty.call(parsed, 'code')) {
        await this.props.authService.initialize();
      }
    }

    // if we've been passed a token then check it's valid
    if (window.location.hash) {
      const temp_token = IafSession.extractToken(window.location.hash);
      if (temp_token) {
        user = await IafSession.setSessionData(temp_token);
        if (user !== undefined) {
          token = temp_token;
        }
      }
    }

    const authTokens = this.props.authService.getAuthTokens();
    if (authTokens && Object.keys(authTokens).length > 0) {
      sessionManage = { ...authTokens }
    }

    // if we don't have a token yet and we have something in the session then
    // check that the token in the session is valid
    if (token === undefined && sessionManage && sessionManage !== undefined) {
      const temp_token = sessionManage.token || sessionManage.access_token;
      try {
        user = await IafSession.setSessionData(temp_token);
        if (user !== undefined) {
          token = temp_token;
        }
      } catch(e) {
        console.error("Session token expired")
      }

    }

    // if we don't have a valid token at this point redirect to login page
    if (!token) {
      //go to login page
      this.props.authService.authorize(inviteId);
    } else {

      if (this.props.ipaConfig) self.setSelectedItems({ipaConfig: this.props.ipaConfig})

      /* load redux extended slices provided by the app */

      /*
       * Here we load the redux reducers (slices) provided by the local application
       * This is an additive, but replace, function. Meaning if the local application
       * adds a reducer with the same name as a framework reducer it will override the
       * framework reducer.
       *
       * We may want to protect against that?
       *
       * Reducer (slice) files must be located in ./app/ipaCore/redux
       */
      if (this.props.ipaConfig && this.props.ipaConfig.redux && this.props.ipaConfig.redux.slices && this.props.ipaConfig.redux.slices.length) {
        this.props.ipaConfig.redux.slices.forEach((sliceFile) => {
          try {
            let slice = require('../../../../app/ipaCore/redux/' + sliceFile.file).default
            let newReducer = addReducerSlice({name: sliceFile.name, slice: slice})
            store.replaceReducer(newReducer)
          } catch(e) {
            console.error(e)
            console.error('Slice not able to be loaded: ' + sliceFile.name)
          }
        })
      } else {
        console.warn("No ipa-core redux configuration found")
      }

      /* load redux extended dashboard components */

      /*
       * Here we load the dashboard components provided by the local application into redux
       * These components if named the same as a framework component can override the
       * framework dashborad component.
       *
       * Dashboard compnent files must be located in ./app/ipaCore/components
       */

      if (this.props.ipaConfig && this.props.ipaConfig.components) {
        if (this.props.ipaConfig.components.dashboard && this.props.ipaConfig.components.dashboard.length) {
          let dashComponents = []
          this.props.ipaConfig.components.dashboard.forEach((dashCompFile) => {
            try {
              let dashComp = require('../../../../app/ipaCore/components/' + dashCompFile.file).default
              dashComponents.push({name: dashCompFile.name, component: dashComp})
            } catch(e) {
              console.error(e)
              console.error('Dashboard component not able to be loaded: ' + dashCompFile.name)
            }
          })
          if (dashComponents.length) store.dispatch(addDashboardComponents(dashComponents))
        }

        /* load redux extended dashboard components */

        /*
        * Here we load the entity components provided by the local application into redux
        * These components if named the same as a framework component can override the
        * framework component.
        *
        * entity compnent files must be located in ./app/ipaCore/components
        */
        if (this.props.ipaConfig.components.entityAction && this.props.ipaConfig.components.entityAction.length) {
          let entityActionComponents = []
          this.props.ipaConfig.components.entityAction.forEach((actionCompFile) => {
            try {
              let actComp = require('../../../../app/ipaCore/components/'+ actionCompFile.file)[actionCompFile.name+'Factory']
              entityActionComponents.push({name: actionCompFile.name, component: actComp})
            } catch(e) {
              console.error(e)
              console.error('Entity Action component not able to be loaded: ' + actionCompFile.name)
            }
          })
          if (entityActionComponents.length) store.dispatch(addEntityComponents('action',entityActionComponents))
        }

        if (this.props.ipaConfig.components.entityData && this.props.ipaConfig.components.entityData.length) {
          let entityDataComponents = []
          this.props.ipaConfig.components.entityData.forEach((dataCompFile) => {
            try {
              let dataComp = require('../../../../app/ipaCore/components/'+ dataCompFile.file)
              let dataCompFactory = dataComp[dataCompFile.name+'Factory']
              entityDataComponents.push({name: dataCompFile.name, component: dataCompFactory})
            } catch(e) {
              console.error(e)
              console.error('Entity Action component not able to be loaded: ' + dataCompFile.name)
            }
          })
          if (entityDataComponents.length) store.dispatch(addEntityComponents('data',entityDataComponents))
        }
      } else {
        console.warn("No ipa-core component configuration found")
      }

      //config loader
      if (loadConfigFromCache && sessionStorage.ipadt_configData) {
        const jsonData = JSON.parse(sessionStorage.ipadt_configData);
        this.onConfigLoad(jsonData, this.testConfig(jsonData), token, user)
      } else {
        const callback = (config, routes) => this.onConfigLoad(config, routes, token, user);
        try {
          let projects = await IafProj.getProjects({_pageSize: 1000});
          if (showProjectPicker)
            self.context.ifefShowModal(
                <ProjectPickerModal
                    configUserType={this.props.ipaConfig.configUserType}
                    referenceAppConfig={this.props.ipaConfig.referenceAppConfig}
                    appContextProps={this.state}
                    defaultConfig={EmptyConfig}
                    onAcceptInvite={this.state.actions.restartApp}
                    projects={projects}
                    testConfig={self.testConfig}
                    userLogout = {this.state.actions.userLogout}
                    onConfigLoad={callback}
                    onCancel={() => self.context.ifefShowModal(false)}
                    referenceAppCreateProject={() => self.context.ifefShowModal(<SetUpProject
                        restartApp={this.state.actions.restartApp}
                        projects={projects}
                        onCancel={() => {
                          this.setState((prev) => {
                            return { ...prev, isshowProjectPickerModal: true };
                          });
                        }}
                    />) }
                />);
        } catch (error) {
          console.error(error);
          callback(EmptyConfig, self.testConfig(EmptyConfig));
        }
      }

      if (this.props.ipaConfig && Array.isArray(_.get(this.props.ipaConfig, 'css'))) {
        this.props.ipaConfig.css.forEach((styleSheet) => {
          try {
            let customCss = require('../../../../app/ipaCore/css/'+ styleSheet)
          } catch(e) {
            console.error("Failed to load custom css styleSheet: ", styleSheet)
          }
        })
      }
    }
  }

  async testConfig(config) {
    return await calculateRoutes(config, this.props.ipaConfig);
  }

  showIpaModal(modalContent) {
    const self = this
    self.context.ifefShowModal(modalContent)
  }

  async onConfigLoad(config, routes, token, user) {

    function hasSisenseConnectors(config) {
      if (config.connectors) {

        let sisenseConnector = _.find(config.connectors, {name: "SisenseIframe"}) || _.find(config.connectors, {name: "SisenseConnect"})
        if (sisenseConnector) {

          let sisUrl = sisenseConnector.config.url
          let lastChar = sisUrl.slice(-1)
          if (lastChar === '/' || lastChar === '\\')
            sisUrl = sisUrl.slice(0, -1)

          sessionStorage.setItem('sisenseBaseUrl', sisUrl)
          return sisUrl
        }
        else return false

      } else return false
    }

    //clear routes immediately so that the UI removes the last project's routes
    this.setState({
      token,
      user,
      router: {
        pageList: [],
        pageRoutes: [],
        pageGroups: [],
      }
    });

    //ONE ROUTES ARE CLEARED, UPDATE CONFIG!
    this.setUserConfig(config);

    //DOMI: now we can safetly prepare new routes once userConfig is updated on state and in REDUX
    routes = await routes



    this.sisenseLogout()

    //Clear all script state in cache and in script engine
    ScriptCache.clearCache();

    IafScriptEngine.clearVars()
  
    this.context.ifefShowModal(false);

    let selectedProj = IafProj.getCurrent();
    if (selectedProj) {

      /*
      * If Sisense Connectors are configured then we need to sign in to Sisense
      * This must be doen before any sisense content is needed
      */
      let sisenseUrl = hasSisenseConnectors(config)
      if (sisenseUrl) {
        const allOrchestrators = await IafDataSource.getOrchestrators();
        const sisenseSSOOrch = _.find(allOrchestrators._list, {_userType: 'Sisense_SSO_JWT_Generator'});

        if (!sisenseSSOOrch) {
          console.error('Sisense is configured in the project but the Sisense SSO Orchestrator is not present')
        } else {
          const orchId = sisenseSSOOrch.id;

          const params = {
            orchestratorId: orchId,
            _actualparams: [
              {
                sequence_type_id: _.get(sisenseSSOOrch, "orchsteps.0._compid"),
                params: {
                  userGroupId: this.state.selectedItems.selectedUserGroupId,
                  projectNamespace: this.state.selectedItems.selectedProject._namespaces[0]
                }
              }
            ]
          }

          const orchResult = await IafDataSource.runOrchestrator(orchId, params);
          const encodedToken = _.get(orchResult, '_result.jwt');

          let sisensejwt_url = sisenseUrl + "/jwt?jwt=" + encodedToken;

          fetch(sisensejwt_url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            redirect: 'manual',
            credentials: 'include'
          }).catch((err) => {
            console.error("ERROR SIGNING IN TO SISENSE: " + sisensejwt_url)
            console.error(err)
          })
        }
      }

      //load all config level scripts
      if (!!config.onConfigLoad && !!config.onConfigLoad.load && config.onConfigLoad.load.length > 0) {

        //load each script
        let loadThese = config.onConfigLoad.load;
        for (let i = 0; i < loadThese.length; i++) {

          await ScriptHelper.loadScript({_userType: loadThese[i]});
        }
      }

      //execute all config level scripts
      if (!!config.onConfigLoad && !!config.onConfigLoad.exec && config.onConfigLoad.exec.length > 0) {

        //load each script
        let execThese = config.onConfigLoad.exec;
        for (let i = 0; i < execThese.length; i++) {

          await ScriptHelper.executeScript(execThese[i]);
        }
      }

      //need to enable the router after we load all the scripts in the config
      //to make sure all pages have data loaded into the script engine beforehand
      if (routes)
        this.setState({
          router: {pageList: routes.pageList, pageRoutes: routes.pageRoutes, pageGroups: routes.pageGroups},
        });

      this.setState({isLoading: false});

      // Eval the "autoeval" script for any bootstrap setup of app.
      if (config.scripts && config.scripts.autoeval) {
        if(!ScriptHelper.isProjectNextGenJs()) ScriptHelper.evalExpressions(config.scripts.autoeval);
      }

      let rootStyles =  config.settings?.styles || this.props.ipaConfig.styleVars || DefaultStyleVars;

      //Load all custom styles from userConfig
      if(rootStyles) {
        var r = document.querySelector(':root');
        Object.entries(rootStyles).map(([key, value]) => {
          r.style.setProperty(key, value)
        })
      }

    } else {
      //This is state where the user has an account but no accepted invites
      if (routes)
        this.setState({
          router: {pageList: routes.pageList, pageRoutes: routes.pageRoutes, pageGroups: routes.pageGroups},
        });
      this.setState({
        isLoading: false
      });
    }


    store.dispatch(addUser(user))

    if (this.props.onConfigLoad) this.props.onConfigLoad(store, config, this.state)

  }

  setUserConfig(config) {
    store.dispatch(addUserConfig(config));
    this.setState({userConfig : config});
  }

  navigateToHomepage() {
    window.location.hash = '/'; //Since we're outside the react router scope, we need to deal with the location object directly
  }



  render() {
    const context = {...this.state};
    return <AppContext.Provider value={context}>{this.props.children}</AppContext.Provider>
  }
}

async function calculateRoutes(config, ipaConfig) {
  const pList = [];
  const pRoutes = [];
  const pGroups = [];

  /*
   * Loads a pageComponent for the app. It will first try to load the pageComponent
   * from the local application. If the pageComponent is not found there it will
   * try to load the pageComponent from the framework. This allows the local
   * application to override a framework page component if it so chooses.
   *
   * If the pageComponent is not found an error is sent to the console and
   * the page is skipped.
   *
   * pageComponents must be in the ./app/ipaCore/pageComponents folder
   */
  function asIpaPage(rawPageComponent, optionalProps) {
    return withAppContext(withGenericPageErrorBoundary(withGenericPage(rawPageComponent, optionalProps)))
  }

  function getPageComponent(pageComponent, pageComponentProps) {

    let component
    try {
      component = require('../../../../app/ipaCore/pageComponents/' + pageComponent + '.jsx').default;
      component = asIpaPage(component, pageComponentProps)
    } catch(e) {

      component = InternalPages[pageComponent] || null

      if (component) {
        component = asIpaPage(component, pageComponentProps)
      }
      else {
        console.error(e)
        console.error("can't find page component: ", pageComponent)
        component = null
      }
    }

    return component

  }

  function addRoute(handlerName, handler, addPage, pathPrefix, pageGroup) {
    if (!handler.pageComponent) {
      console.error("This version of AppProvider only supports handlers with a pageComponent")
      return
    }

    const handlerPath = (handler.path || '/' + handlerName);

    let item = {
      path: pathPrefix ? pathPrefix + handlerPath : handlerPath,
      title: handler.title || 'no title',
      icon: (handler.icon || ''),
      name: handlerName,
      exact: true
    };

    let detailItem = undefined;
    let detailComponent = undefined;
    if(handler.detailPage){
      const detailComponentPath = `${item.path}/${handler.detailPage.pathParam}`;
      detailItem = {
        path: detailComponentPath,
        nested: handler.detailPage.nested,
        nestedPath: handler.detailPage.pathParam,
        title: handler.detailPage.title || item.title,
        icon: handler.detailPage || item.icon,
        name: handlerName,
        exact: item.exact,
      };
      //if our route is nested, parent cannot be exact
      if(handler.detailPage.nested){
        item.exact = false;
      }
    }

    let component = getPageComponent(handler.pageComponent, {masterPage : item, detailPage: detailItem});
    if (!component) return

    if(handler.detailPage){
      detailComponent = getPageComponent(handler.detailPage.component,  {masterPage : item});
      if (detailComponent) {
        detailItem.nestedRoute = buildRoute(detailItem,detailComponent);
      }
    }

    if(handler.detailPage && handler.detailPage.nested){
      //nested routes will only work with react-roure v6 and <Outlet/>, this is why we render only master at the moment
      //pRoutes.push(buildRoute(item,component,detailItem,detailComponent));
      pRoutes.push(buildRoute(item,component));
    } else if (handler.detailPage){
      pRoutes.push(buildRoute(item,component));
      detailComponent && pRoutes.push(buildRoute(detailItem,detailComponent));//we will use this route in master component
    } else {
      pRoutes.push(buildRoute(item,component));
    }

    if (addPage) {
      pList.push(item);
      if(pageGroup){
        pGroups.find(g => g.groupName == pageGroup).items.push(item);
      }
    }
  }

  function buildRoute(masterItem, masterComponent, detailItem, detailComponent){
    return <Route path={masterItem.path} key={masterItem.path} component={masterComponent} exact={masterItem.exact}>
      {(detailItem && detailComponent) ? <Route path={detailItem.path} key={detailItem.nestedPath} component={detailComponent} exact={detailItem.exact}/> : null}
    </Route>
  }

  function addGroup(groupName, icon){
    let group = {
      groupName: groupName,
      icon: icon || '',
      items: []
    }
    pGroups.push(group);
  }

  let pages = config.pages ? Object.keys(config.pages) : Object.keys(config.groupedPages);
  const pagesConfig = config.pages || config.groupedPages;
  const usingGroupedConfig = !!config.groupedPages;
  if (pages.length == 0) {
    console.error("No pages to display = no routes to add")
    return
  }

  // Sort the pages as specified in config, or alphabetically
  if (pagesConfig[pages[0]].position) {
    pages.sort((a, b) => pagesConfig[a].position > pagesConfig[b].position ? 1 : -1)
  }
  else {
    pages.sort();
  }

  let alreadyRoutedPages = []

  // Add the component for each page (dynamically requires the JSX)
  pages.forEach(key => {
    if(usingGroupedConfig){
      addGroup(key, pagesConfig[key].icon);
      pagesConfig[key].pages.forEach(page => {
        if (page.handler) {
          let handler = config.handlers[page.handler];
          alreadyRoutedPages.push(page.handler);
          addRoute(page.handler, handler, true, undefined, key);
        }
      })
    }else{
      let page = config.pages[key];
      if (page.handler) {
        let handler = config.handlers[page.handler];
        alreadyRoutedPages.push(page.handler);
        addRoute(page.handler, handler, true);
      }
    }
  });


  //Add handlers that are not present in pages or groupedPages
  // We also skip the homepage as it's handled differently later
  Object.entries(config.handlers)
    .forEach(([key, value]) => {
      const isAlreadyRouted = alreadyRoutedPages.includes(key)
      const isHomepage = key === config.homepage?.handler
      if(!isAlreadyRouted && !isHomepage) {
        addRoute(key, value, true);
      }
    })

  // Add homepage
  let homePageHandler
  if (config.homepage) {
    homePageHandler = config.handlers[config.homepage.handler]
  }
  else {
    console.warn("no homepage specified, defaulting to first page")
    homePageHandler = config.handlers[actualPage(config, pages[0]).handler];
  }
  let HomePage = getPageComponent(homePageHandler.pageComponent);
  if (!HomePage) console.error("can't find page component, no homepage", homePageHandler.pageComponent)
  else {
    pRoutes.unshift(<Route path='/' key='/' exact={true} component={HomePage} />);
    pRoutes.push(<Redirect to={'/'} key={'redirect_to_root'}/>);
  }

  return {pageList: pList, pageRoutes: pRoutes, pageGroups: pGroups};
}

AppProvider.contextTypes = {
  ifefSnapper: PropTypes.object,
  ifefShowModal: PropTypes.func
};

export default withAuthHoc(AppProvider);
