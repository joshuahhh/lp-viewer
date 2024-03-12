import { memo, useState } from "react";
import { BsInfoLg } from "react-icons/bs";
import { Link } from "react-router-dom";

export const InfoStuff = memo((props: {
  setSlot: (elem: HTMLDivElement | null) => void,
  warning?: boolean,
}) => {
  const { setSlot, warning } = props;
  console.log("warning", warning)

  const [showInfo, setShowInfo] = useState(false);

  return <>
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        margin: 15,
        fontSize: 20,
        cursor: 'pointer',
        background: warning ? 'pink' : 'white',
        // background: '#aaa',
        // color: '#fff',
        color: "#363636",
        borderRadius: 100,
        width: 30,
        height: 30,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        boxShadow: "0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05)",
      }}
      onClick={() => setShowInfo(!showInfo)}
    >
      <BsInfoLg/>
    </div>
    <div
      className="bottom-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 50,
        left: 50,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 99,
      }}
    >
      <div
        className="info"
        style={{
          margin: 15,
          background: 'white',
          color: '#363636',
          borderRadius: 10,
          padding: 15,
          display: showInfo ? 'block' : 'none',
          boxShadow: "0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05)",
          fontSize: '80%',
        }}
      >
        <div>
          this is <Link to="/">lp-viewer</Link>
        </div>
        <div ref={setSlot}/>
      </div>
    </div>
  </>;
});
