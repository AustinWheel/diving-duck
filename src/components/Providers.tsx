"use client";

import {
  BorderStyle,
  ChartMode,
  ChartVariant,
  DataThemeProvider,
  IconProvider,
  NeutralColor,
  ScalingSize,
  Schemes,
  SolidStyle,
  SolidType,
  SurfaceStyle,
  ThemeProvider,
  ToastProvider,
  TransitionStyle,
} from "@once-ui-system/core";
import { style, dataStyle } from "../resources/once-ui.config";
import { iconLibrary } from "../resources/icons";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      brand={style.brand as Schemes}
      accent={style.accent as Schemes}
      neutral={style.neutral as NeutralColor}
      solid={style.solid as SolidType}
      solidStyle={style.solidStyle as SolidStyle}
      border={style.border as BorderStyle}
      surface={style.surface as SurfaceStyle}
      transition={style.transition as TransitionStyle}
      scaling={style.scaling as ScalingSize}
    >
      <DataThemeProvider
        variant={dataStyle.variant as ChartVariant}
        mode={dataStyle.mode as ChartMode}
        height={dataStyle.height}
        axis={{
          stroke: dataStyle.axis.stroke,
        }}
        tick={{
          fill: dataStyle.tick.fill,
          fontSize: dataStyle.tick.fontSize,
          line: dataStyle.tick.line,
        }}
      >
        <ToastProvider>
          <IconProvider icons={iconLibrary}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <ProjectProvider>{children}</ProjectProvider>
              </AuthProvider>
            </QueryClientProvider>
          </IconProvider>
        </ToastProvider>
      </DataThemeProvider>
    </ThemeProvider>
  );
}
