"use client";

import React from "react";
import Link from "next/link";
import {
  IoBookOutline,
  IoPeopleOutline,
  IoMailOutline,
  IoEnterOutline,
} from "react-icons/io5";

const menuItems = [
  {
    title: "Cursos",
    href: "/courses",
    icon: <IoBookOutline />,
    gradientFrom: "#56CCF2",
    gradientTo: "#2F80ED",
  },
  {
    title: "Mentores",
    href: "/dashboard",
    icon: <IoPeopleOutline />,
    gradientFrom: "#a955ff",
    gradientTo: "#ea51ff",
  },
  {
    title: "Contacto",
    href: "#footer",
    icon: <IoMailOutline />,
    gradientFrom: "#FF9966",
    gradientTo: "#FF5E62",
  },
  {
    title: "Ingresar",
    href: "/auth",
    icon: <IoEnterOutline />,
    gradientFrom: "#1CB899",
    gradientTo: "#10b981",
  },
];

export function GradientMenu() {
  return (
    <ul className="flex items-center gap-3 sm:gap-4">
      {menuItems.map(({ title, href, icon, gradientFrom, gradientTo }, idx) => (
        <li
          key={idx}
          style={
            {
              "--gradient-from": gradientFrom,
              "--gradient-to": gradientTo,
            } as React.CSSProperties
          }
          className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 hover:w-32 sm:hover:w-36 hover:shadow-none group cursor-pointer"
        >
          <Link href={href} className="absolute inset-0 flex items-center justify-center rounded-full">
            {/* Gradient background on hover */}
            <span className="absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-all duration-500 group-hover:opacity-100" />
            {/* Blur glow */}
            <span className="absolute top-[10px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[15px] opacity-0 -z-10 transition-all duration-500 group-hover:opacity-50" />

            {/* Icon */}
            <span className="relative z-10 transition-all duration-500 group-hover:scale-0">
              <span className="text-xl sm:text-2xl text-white/80">{icon}</span>
            </span>

            {/* Title */}
            <span className="absolute text-white uppercase tracking-wide text-xs sm:text-sm font-bold transition-all duration-500 scale-0 group-hover:scale-100 delay-150 whitespace-nowrap">
              {title}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
