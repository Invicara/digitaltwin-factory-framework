/**
 * ****************************************************************************
 *
 * INVICARA INC CONFIDENTIAL __________________
 *
 * Copyright (C) [2012] - [2019] INVICARA INC, INVICARA Pte Ltd, INVICARA INDIA
 * PVT LTD All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains the property of
 * Invicara Inc and its suppliers, if any. The intellectual and technical
 * concepts contained herein are proprietary to Invicara Inc and its suppliers
 * and may be covered by U.S. and Foreign Patents, patents in process, and are
 * protected by trade secret or copyright law. Dissemination of this information
 * or reproduction of this material is strictly forbidden unless prior written
 * permission is obtained from Invicara Inc.
 */

import React from "react";
import _ from 'lodash'

import {IafProj, IafUserGroup} from '@invicara/platform-api'
import {StackableDrawer} from '../../IpaControls/StackableDrawer'
import RadioButtons from '../../IpaControls/RadioButtons'
import SimpleTextThrobber from '../../IpaControls/SimpleTextThrobber'

import {GroupCard} from './GroupCard'
import {UserCard} from './UserCard'
import {InviteCard} from './InviteCard'
import {InviteForm} from './InviteForm'

import './UserGroupView.scss'

class UserGroupView extends React.Component {
    constructor(props) {
      super(props);

      this.state = {
        pageModes: ['UserGroups', 'Users'],
        pageMode: 'UserGroups',
        allUserGroupNamesUpper: [], //list of uppercase usergroup names for easy comparisons
        invalidUserGroups: [], //userGroups on the project the user can't interact with
        userGroups: [], //userGroups on the project the user can interact with
        selectedUserGroup: null, //the currently selected UserGroup
        editingUserGroup: false, //if the user is editng the UserGroup
        userGroupNameEdit: "", //the editable UserGroup name
        savingUserGroup: false, //if we are saving the UserGroup to the platform
        userGroupNameEditError: null, //any error with the UserGroup name
        usersInSelectedGroup: [], //user who are in the currently selected UserGroup
        loadingInvites: true, //whether we are loading invites for usergroup or user
        invitesInSelectedGroup: [], //pending invites in a group
        expiredInvitesInSelectedGroup: [], //expired invites in a group
        users: [], //list of all users in the project
        selectedUser: null, //the currently selected user
        userGroupsForSelectedUser: [], //the valid usergroups to which the selected user belongs
        invitesForSelectedUser: [], //invites for the seleted user
        expiredInvitesForSelectedUser: [] //expired invites for the selected user
      }

      this.onModeChange = this.onModeChange.bind(this)
      this.getAllUserGroups = this.getAllUserGroups.bind(this)
      this.setSelectedUserGroup = this.setSelectedUserGroup.bind(this)
      this.toggleUserGroupEditable = this.toggleUserGroupEditable.bind(this)
      this.onUserGroupNameChange = this.onUserGroupNameChange.bind(this)
      this.updateUserGroup = this.updateUserGroup.bind(this)
      this.sortGroupsBasedOnConfig = this.sortGroupsBasedOnConfig.bind(this)
      this.loadUserGroupData = this.loadUserGroupData.bind(this)
      this.getAllUsers = this.getAllUsers.bind(this)
      this.setSelectedUser = this.setSelectedUser.bind(this)
      this.loadUserData = this.loadUserData.bind(this)
      this.updateCurrentView = this.updateCurrentView.bind(this)

    }

    async componentDidMount() {

      if (this.props.handler.config.defaultView && this.props.handler.config.defaultView.toUpperCase() === 'USERS')
        this.setState({pageMode: 'Users'}, this._loadAsyncData)
      else
        this.setState({pageMode: 'UserGroups'}, this._loadAsyncData)

      this.props.onLoadComplete();
      console.log('props', this.props);
      console.log('state', this.state);
  }

    async _loadAsyncData() {
       
      await this.getAllUserGroups()
      this.getAllUsers()

    }
    
    onModeChange(e) {
      this.setState({pageMode: e.target.value, editingUserGroup: false})
      if (e.target.value === 'UserGroups') this.loadUserGroupData()
      
    }

    sortGroupsBasedOnConfig(groups, configs) {

      //determines whether a group has a config matching one in configs
      function hasMatchingConfig(group, configs) {

        let match = false
        for (let i = 0; i < configs.length; i++) {
          if (_.find(group._userAttributes.userConfigs, {_id: configs[i]._id})) {
            match = true
            break
          }
        }
        
        return match
      }

      groups.sort((a,b) => {
        return a._name.localeCompare(b._name)
      })

      //further filter down to just the userGroups with a userConfig for this application
      let groupsWithAppUserConfig = groups.filter(g => hasMatchingConfig(g, configs))

      //get the list of userGroups in the project with out config for this app
      let invalidGroups = groups.filter((g) => {
        return !g._userAttributes.userConfigs || !hasMatchingConfig(g, configs)
      })

      return {
        validGroups: groupsWithAppUserConfig,
        invalidGroups: invalidGroups
      }

    }

    async getAllUserGroups(selectedUserGroup) {
      
      return new Promise((resolve, reject) => [
        IafProj.getUserGroups(this.props.selectedItems.selectedProject).then(async (groups) => {
  
          //get all user configs int he project for this application (ie. _userType)
          IafProj.getUserConfigs(this.props.selectedItems.selectedProject, {query: {_userType: this.props.selectedItems.ipaConfig.configUserType}}).then((userConfigs) => {
            
            //get valid and invalid groups
            let sortedUserGroups = this.sortGroupsBasedOnConfig(groups, userConfigs)
            
            let allUserGroupNamesUpper = groups.map(g => g._name.toUpperCase())
  
            let applySelectedUserGroup = selectedUserGroup ? selectedUserGroup : sortedUserGroups.validGroups[0]
  
            this.setState({allUserGroupNamesUpper: allUserGroupNamesUpper, invalidUserGroups: sortedUserGroups.invalidGroups, userGroups: sortedUserGroups.validGroups}, this.setSelectedUserGroup(applySelectedUserGroup))
          
            resolve(applySelectedUserGroup)
          })
        })
      ])
    }

    setSelectedUserGroup(ug) {
      this.setState({
        selectedUserGroup: ug, 
        usersInSelectedGroup: [], 
        invitesInSelectedGroup: [],
        expiredInvitesInSelectedGroup: []}, this.loadUserGroupData)
    }

    loadUserGroupData() {
      this.setState({loadingInvites: true})
      IafUserGroup.getUsers(this.state.selectedUserGroup).then((users) => {
        this.setState({usersInSelectedGroup: users})
      })
      
      IafUserGroup.getInvites(this.state.selectedUserGroup).then((invites) => {
        let pendingInvites = invites._list.filter(i => i._status === 'PENDING')
        let expiredInvites = invites._list.filter(i => i._status === 'EXPIRED')

        this.setState({invitesInSelectedGroup: pendingInvites, expiredInvitesInSelectedGroup: expiredInvites, loadingInvites: false})
      })
    }

    toggleUserGroupEditable(e) {
      if (e) e.preventDefault()
      this.setState({userGroupNameEdit: this.state.selectedUserGroup._name, editingUserGroup: !this.state.editingUserGroup, userGroupNameEditError: null})
    }

    onUserGroupNameChange(e) {
      this.setState({userGroupNameEdit: e.target.value})
    }

    //currently we only update the usergroup's name
    updateUserGroup(e) {
      e.preventDefault()

      if (!this.state.allUserGroupNamesUpper.includes(this.state.userGroupNameEdit.toUpperCase())) {
        this.setState({savingUserGroup: true})
        let updatedGroup = Object.assign({}, this.state.selectedUserGroup, {_name: this.state.userGroupNameEdit})

        IafUserGroup.update(updatedGroup).then((resGroup) => {

          this.toggleUserGroupEditable()
          this.setState({savingUserGroup: false, userGroups: [], invalidGroups: [], selectedUserGroup: null})
          this.getAllUserGroups(resGroup)

        }).catch((err) => {
          console.error('error saving usergroup change', err)
          this.setState({userGroupNameEditError: err.message})
        })
      } else {
        this.setState({userGroupNameEditError: "Duplicate UserGroup name! Please choose a different name."})
      }
      
    }

    getAllUsers() {
      IafProj.getUsers(this.props.selectedItems.selectedProject).then((allUsers) => {
        allUsers.sort((a,b) => {return a._lastname.localeCompare(b._lastname)})
  
        this.setState({users: allUsers, selectedUser: allUsers[0]}, this.loadUserData)
      })
    }

    setSelectedUser(ug) {
      this.setState({
        selectedUser: ug,
        userGroupsForSelectedUser: [],
        invitesForSelectedUser: []}, this.loadUserData)
    }

    async loadUserData() {
      
      this.setState({loadingInvites: true})
      //this doesn't work though it should
      //so instead we have to go the long way around to get the user groups for a user
      // IafProj.getUserGroupsForUser(this.state.selectedUser, this.props.selectedItems.selectedProject).then((ugs) => {
      //   console.log(ugs)
      // })

      let ugresults = await Promise.all(this.state.userGroups.map((ug) => {
        return IafUserGroup.getUsers(ug).then((users) => {
          if (_.find(users, {_id: this.state.selectedUser._id})) return ug
          else return null
        })
      }))

      ugresults = ugresults.filter(u => u)

      this.setState({userGroupsForSelectedUser: ugresults})

      //we have to do a similar workaround for invites because there is no access
      //to fetch invites by another user so we have go usergroup by usergroup
      let invresults = await Promise.all(this.state.userGroups.map((ug) => {
        return IafUserGroup.getInvites(ug).then((invs) => {
          return _.find(invs._list, {_email: this.state.selectedUser._email})
        })
      }))

      invresults = invresults.filter(i => i)
      let validInvites = invresults.filter(i => i._status === "PENDING")
      let expiredInvites = invresults.filter(i => i._status === "EXPIRED")

      this.setState({invitesForSelectedUser: validInvites, expiredInvitesForSelectedUser: expiredInvites, loadingInvites: false})
    }

    updateCurrentView() {

      if (this.state.pageMode === 'UserGroups') this.loadUserGroupData()
      else this.loadUserData()

    }

    render() {

        return (
          <div className='user-group-view'>

            {this.props.handler.config.allowUserGroupInvite && <StackableDrawer level={1} iconKey='fas fa-user-plus' defaultOpen={false}>
              <InviteForm appName={this.props.selectedItems.ipaConfig.appName} 
                        appUrl={this.props.handler.config.appUrl}
                        currentUser={this.props.user} 
                        users={this.state.users} 
                        userGroups={this.state.userGroups} 
                        project={this.props.selectedItems.selectedProject}
                        onInvitesSent={this.updateCurrentView}/>
            </StackableDrawer>}

            <StackableDrawer level={this.props.handler.config.allowUserGroupInvite ? 2 : 1} iconKey='fas fa-users' defaultOpen={true}>
              <div className='switchable-list-view'>
                <div className='list-header'>
                  <div className='radio-btns'>
                    <RadioButtons options={this.state.pageModes} value={this.state.pageMode} onChange={this.onModeChange} labelPlacement='end' />
                  </div>
                </div>
                <hr/>
                {this.state.pageMode === 'UserGroups' && <div>
                  {!this.state.selectedUserGroup && <SimpleTextThrobber throbberText='Loading UserGroups' />}
                  <ul className='user-group-list'>
                    {this.state.userGroups.map(u => <GroupCard key={u._id} group={u} 
                                                      selectable={true} 
                                                      isSelected={u._id === this.state.selectedUserGroup._id} 
                                                      onClick={(e) => this.setSelectedUserGroup(u)} />)}
                  </ul>
                  {this.state.invalidUserGroups.length > 0 && <div className='other-groups'>
                    <span>Other Groups</span>
                    <ul className='other-group-list'>
                      {this.state.invalidUserGroups.map(u => <GroupCard key={u._id} group={u} disabled={true} />)}
                    </ul>
                  </div>}
                </div>}
                {this.state.pageMode === 'Users' && <div>
                {!this.state.selectedUser && <SimpleTextThrobber throbberText='Loading Users' />}
                  <ul className='user-group-list'>
                    {this.state.users.map(u => <UserCard key={u._id} user={u} 
                                                      isCurrentUser={u._id === this.props.user._id} 
                                                      selectable={true} 
                                                      isSelected={u._id === this.state.selectedUser._id}
                                                      onClick={(e) => this.setSelectedUser(u)} />)}
                  </ul>
                </div>}
              </div>
            </StackableDrawer>

            

            {this.state.pageMode === 'UserGroups' && <div className='usergroup-mode-view'>

              <div className='row1'>
                {!this.state.editingUserGroup && <div className='usergroup-name'>
                  <h1>{this.state.selectedUserGroup ? this.state.selectedUserGroup._name : ""}</h1>
                  {this.props.handler.config.allowUserGroupEdit && this.state.selectedUserGroup && <span className='ug-btn'><a href="#" onClick={this.toggleUserGroupEditable}>edit</a></span>}
                </div>}
                {this.state.editingUserGroup && <div><div className='usergroup-name editable'>
                  <h1><input className='usergroup-name-input' type='text' disabled={this.state.savingUserGroup} value={this.state.userGroupNameEdit} onChange={this.onUserGroupNameChange}/></h1>
                  <span className='ug-btn'>
                    {!this.state.savingUserGroup && <a href="#" onClick={this.updateUserGroup}>save</a>}
                    {this.state.savingUserGroup && <span className='disabled-ug-btn'>save</span>}
                  </span>
                  <span className='ug-btn'>
                    {!this.state.savingUserGroup && <a href="#" onClick={this.toggleUserGroupEditable}>cancel</a>}
                    {this.state.savingUserGroup && <span className='disabled-ug-btn'>cancel</span>}
                  </span>
                </div>
                {this.state.userGroupNameEditError && <div className='usergroup-name-error'>{this.state.userGroupNameEditError}</div>}</div>}
              </div>

              <hr/>

              <div className='row2'>
                <div className='usergroup-members'>
                  <div><h3>Members</h3></div>
                  {this.state.usersInSelectedGroup.length === 0 && <div className='throbber'><SimpleTextThrobber throbberText='Loading UserGroup Members' /></div>}
                  <ul className='group-users-list'>
                    {this.state.usersInSelectedGroup.map(u => <UserCard key={u._id} user={u} 
                                                      isCurrentUser={u._id === this.props.user._id} />)}
                  </ul>
                </div>
                <div className='usergroup-invites'>
                  <div><h3>Invites</h3></div>
                  {this.state.loadingInvites && <div className='throbber'><SimpleTextThrobber throbberText='Loading UserGroup Invites' /></div>}
                  {!this.state.loadingInvites && this.state.invitesInSelectedGroup.length === 0 && <span className='indent-header'>No pending invites</span>}
                  <ul>
                    {this.state.invitesInSelectedGroup.map(i => <InviteCard key={i._id} invite={i}
                                                                        isCurrentUser={i._email === this.props.user._email} 
                                                                        existingUser={_.find(this.state.users, {_email: i._email})} />)}
                  </ul>
                  {this.state.expiredInvitesInSelectedGroup.length > 0 && <div><span className='indent-header'>Expired Invites</span>
                    <ul>
                    {this.state.expiredInvitesInSelectedGroup.map(i => <InviteCard key={i._id} invite={i}
                                                                        isCurrentUser={i._email === this.props.user._email} 
                                                                        existingUser={_.find(this.state.users, {_email: i._email})} />)}
                    </ul>
                  </div>}
                </div>
              </div>

            </div>}

            {this.state.pageMode === 'Users' && <div className='user-mode-view'>

              <div className='row1'>
                <div className='user-name-title'>
                  <h1>{this.state.selectedUser ? this.state.selectedUser._lastname + ", " + this.state.selectedUser._firstname : ""}</h1>
                </div>
              </div>

              <hr/>

              <div className='row2'>
                <div className='member-usergroups'>
                  <div><h3>UserGroups</h3></div>
                  {this.state.userGroupsForSelectedUser.length === 0 && <div className='throbber'><SimpleTextThrobber throbberText='Loading UserGroups' /></div>}
                  <ul className='member-usergroup-list'>
                    {this.state.userGroupsForSelectedUser.map(u => <GroupCard key={u._id} group={u} />)}
                  </ul>
                </div>

                <div className='member-invites'>
                  <div><h3>Invites</h3></div>
                  {this.state.loadingInvites && <div className='throbber'><SimpleTextThrobber throbberText='Loading User Invites' /></div>}
                  {!this.state.loadingInvites && this.state.invitesForSelectedUser.length === 0 && <span className='indent-header'>No pending invites</span>}
                  <ul>
                    {this.state.invitesForSelectedUser.map(i => <InviteCard key={i._id} invite={i}
                                                                        isCurrentUser={i._email === this.props.user._email} 
                                                                        existingUser={_.find(this.state.users, {_email: i._email})} />)}
                  </ul>
                  {this.state.expiredInvitesForSelectedUser.length > 0 && <div><span className='indent-header'>Expired Invites</span>
                    <ul>
                    {this.state.expiredInvitesForSelectedUser.map(i => <InviteCard key={i._id} invite={i}
                                                                        isCurrentUser={i._email === this.props.user._email} 
                                                                        existingUser={_.find(this.state.users, {_email: i._email})} />)}
                    </ul>
                  </div>}
                </div>
              </div>

            </div>}
          </div>
        )
    }
}

export default UserGroupView;