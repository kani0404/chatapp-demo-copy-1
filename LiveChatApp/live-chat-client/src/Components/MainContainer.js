import React, { createContext, useState } from "react";
import "./myStyles.css";
import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

export const myContext = createContext();
function MainContainer() {
  const lightTheme = useSelector((state) => state.themeKey);
  const [refresh, setRefresh] = useState(true);
  const location = useLocation();
  const isModernGroupChat = location.pathname.startsWith("/app/group/");

  return (
    <div className={"main-container" + (lightTheme ? "" : " dark")} style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden'
    }}>
      <myContext.Provider value={{ refresh: refresh, setRefresh: setRefresh }}>
        {!isModernGroupChat && <Sidebar />}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%'
        }}>
          <Outlet />
        </div>
      </myContext.Provider>
    </div>
  );
}

export default MainContainer;
