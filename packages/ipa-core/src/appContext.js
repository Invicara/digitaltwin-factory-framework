import React from "react";

export const AppContext = React.createContext();

export const withAppContext = (Component) => (props) => (<AppContext.Consumer>
    {(contextProps) => <Component {...props} {...contextProps}/>}
</AppContext.Consumer>);