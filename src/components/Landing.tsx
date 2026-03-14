import { PropsWithChildren } from "react";
import { config } from "../config";
import "./styles/Landing.css";

const Landing = ({ children }: PropsWithChildren) => {
  const nameParts = config.developer.fullName.split(" ");
  const firstName = nameParts[0] || config.developer.name;
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-container">
          <div className="landing-intro">
            <h2>Hello! I'm</h2>
            <h1>
              {firstName.toUpperCase()}
              {' '}
              <br />
              {lastName && <span>{lastName.toUpperCase()}</span>}
            </h1>
          </div>
          <div className="landing-info">
            {/* <h3>An</h3> */}
            <h2 className="landing-info-h2">
              <div className="landing-h2-1">Mobile Dev</div>
            </h2>
            <h2>
              <div className="landing-h2-info">software Eng</div>
            </h2>
          </div>
          {/* Mobile photo - shows only on mobile when 3D character is hidden */}
          <div className="mobile-photo">
            <img src="/images/Black and Red Simple Modern Photographer Facebook Profile Picture.svg" alt="Amr Elsherif" />
          </div>
        </div>
        {children}
      </div>
    </>
  );
};

export default Landing;
