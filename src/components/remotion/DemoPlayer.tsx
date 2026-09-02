'use client';

import React, { useRef } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { DemoComposition } from './DemoComposition';

export const DemoPlayer: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);

  return (
    <div className="rounded-none md:rounded-[40px] overflow-hidden border border-slate-200 shadow-2xl bg-white relative isolate transform-gpu">
      <Player
        ref={playerRef}
        component={DemoComposition}
        durationInFrames={720}
        compositionWidth={1280}
        compositionHeight={720}
        fps={30}
        style={{
          width: '100%',
          aspectRatio: '16/9',
          borderRadius: 'inherit',
          overflow: 'hidden'
        }}
        autoPlay={true}
        loop={true}
        acknowledgeRemotionLicense={true}
      />
    </div>
  );
};
