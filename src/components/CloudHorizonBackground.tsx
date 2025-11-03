"use client";

import React from "react";

const CloudHorizonBackground: React.FC = () => {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none">
      {/* Sky gradient */}
      <div className="h-full w-full bg-gradient-to-b from-sky-200 via-sky-100 to-white" />

      {/* Soft cloud blobs */}
      <div className="absolute top-10 left-[8%] w-56 h-20 rounded-full bg-white/70 blur-2xl" />
      <div className="absolute top-20 left-[28%] w-72 h-28 rounded-full bg-white/70 blur-2xl" />
      <div className="absolute top-16 right-[10%] w-64 h-24 rounded-full bg-white/70 blur-2xl" />
      <div className="absolute top-28 right-[35%] w-52 h-20 rounded-full bg-white/60 blur-2xl" />
      <div className="absolute top-36 left-[60%] w-64 h-24 rounded-full bg-white/60 blur-2xl" />

      {/* Horizon glow at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-sky-50/80 via-white/70 to-transparent" />
    </div>
  );
};

export default CloudHorizonBackground;