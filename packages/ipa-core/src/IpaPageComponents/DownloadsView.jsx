import React from "react";
import _ from 'lodash';
import moment from 'moment';

import {getPlatformPath} from '../IpaPaths'

class DownloadsView extends React.Component {
    constructor(props) {
        super(props);

       this.state = {
           isPageLoading: true,
           manifests: [],
           error: null
       }
       this._loadAsyncData = this._loadAsyncData.bind(this);
       this.toggleDetails = this.toggleDetails.bind(this);
    }

    async _loadAsyncData() {
        
        fetch(getPlatformPath('DOWNLOADS')).then(async (resp) => {
          let downs = await resp.json();

          let manifests = [];
          downs.manifests.forEach((mani) => {
              if (this.props.handler.systems.includes(mani.system))
                  manifests.push(mani);
          });

          for (let i = 0; i < manifests.length; i++) {
             let mani = manifests[i];
             for (let v = 0; v < mani.versions.length; v++) {
                  let ver = mani.versions[v];

                  ver.showDetails = false;
                  let resp = await fetch(getPlatformPath('PLUGIN_BASE', ver.manifest)).catch((err) => {
                      console.error(err);
                  });
                  ver.details = await resp.json();
             };

          };

          this.setState({manifests: manifests});
        }).catch((err) => {
            console.error('-->', err);
            this.setState({isPageLoading: false, error: err.toString()});
        });
    }

    toggleDetails(manifest, version) {

        let {manifests} = this.state;

        for (let i = 0; i < manifests.length; i++) {

            if (manifests[i].system === manifest.system) {
                let mani = manifests[i];

                for (let v = 0; v < mani.versions.length; v++) {
                    let ver = mani.versions[v];

                    if (ver.version === version.version) {

                        ver.showDetails = !ver.showDetails;
                        break;
                    }
                }
                break;
            }
        }

        this.setState({manifests: manifests});

    }


    async componentDidMount() {
        //When the page mounts load the asyn data (script and other)
        //and then create the column info for the upload table
        this.setState({isPageLoading: true});

        await this._loadAsyncData();

        this.setState({isPageLoading: false}, this.props.onLoadComplete);
    }

    render() {

        let headerStyles = {fontWeight: 'bold', padding: '8px'};
        let cellStyles = {padding: '8px'};

        return (
                <div>
                {!this.state.isPageLoading && !!this.state.error && <div>{this.state.error}</div>}
                {!this.state.isPageLoading && !this.state.error  ? <div style={{padding: '40px'}}>
                    <div style={{marginLeft: '20%', marginRight: '20%'}}>

                        {this.state.manifests.map((mani) => {

                            return  <div key={mani.system}>
                                        <h3>{mani.system}</h3>
                                        <div style={{marginLeft: '20px', marginTop: '20px'}}>

                                            {mani.versions.map((ver) => {

                                                return <div key={ver.manifest} style={{verticalAlign: 'center'}}>
                                                    <h4 style={{display: 'inline', marginRight: '20px'}}>{ver.details.resources.en.name}</h4>
                                                    <i title='Info' style={{cursor: 'pointer', fontSize: '24px', display: 'inline', color: '#387ef5', marginRight: '20px'}} className='ion-ios-information-outline' onClick={(e) => this.toggleDetails(mani, ver)}></i>
                                                    <a href={getPlatformPath('PLUGIN_BASE', ver.details.filename)}>
                                                        <i title='Download' style={{cursor: 'pointer', fontSize: '24px', display: 'inline', color: '#387ef5'}} className='icon ion-ios-cloud-download'></i>
                                                    </a>
                                                    {ver.showDetails && <div style={{marginLeft: '20px', marginTop: '10px'}}>
                                                            <table >
                                                            <tbody>
                                                                <tr>
                                                                    <th style={headerStyles}>Filename</th>
                                                                    <td style={cellStyles}>{ver.details.filename.split('/')[1]}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th style={headerStyles}>File Size</th>
                                                                    <td style={cellStyles}>{(Math.round((ver.details.filesize/1000000) * 100) / 100) + ' MB'}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th style={headerStyles}>Language</th>
                                                                    <td style={cellStyles}>{ver.details.resources.en.displaylanguage}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th style={headerStyles}>Supported Operating Systems</th>
                                                                    <td style={cellStyles}>{ver.details.resources.en.ossupport}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th style={headerStyles}>Updated</th>
                                                                    <td style={cellStyles}>{moment(parseInt(ver.details.posteddate)).format('dddd, MMMM Do YYYY')}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th style={headerStyles}>Version</th>
                                                                    <td style={cellStyles}>{ver.details.version}</td>
                                                                </tr>
                                                            </tbody>
                                                            </table>
                                                        </div>}
                                                    <hr/>
                                                </div>
                                            })}

                                        </div>
                                    </div>



                        })}
                    </div>

                </div> : null}
                </div>)
    }
}

export default DownloadsView;
