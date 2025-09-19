import type React from "react";

const BackgroundImage: React.FC = () => (
  <div className="absolute top-0 left-0 w-full h-full">
    <img
      src="background.png"
      alt="Background"
      className="w-full h-full object-cover opacity-50"
    />
  </div>
);

export default BackgroundImage;
