import { IconType } from "react-icons";

import {
  HiOutlineRocketLaunch,
  HiOutlineBolt,
  HiOutlineShieldCheck,
  HiOutlineBookOpen,
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineKey,
  HiOutlineBell,
  HiOutlineCodeBracket,
  HiOutlineArrowDownTray,
} from "react-icons/hi2";

export const iconLibrary: Record<string, IconType> = {
  rocket: HiOutlineRocketLaunch,
  lightning: HiOutlineBolt,
  zap: HiOutlineBolt,
  shield: HiOutlineShieldCheck,
  book: HiOutlineBookOpen,
  gauge: HiOutlineChartBar,
  clock: HiOutlineClock,
  key: HiOutlineKey,
  bell: HiOutlineBell,
  code: HiOutlineCodeBracket,
  download: HiOutlineArrowDownTray,
};

export type IconLibrary = typeof iconLibrary;
export type IconName = keyof IconLibrary;
