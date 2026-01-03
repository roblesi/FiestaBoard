/**
 * Backward compatibility - re-exports from board-colors.ts
 * @deprecated Use imports from "@/lib/board-colors" instead
 */

export {
  BOARD_COLORS,
  BOARD_COLORS as VESTABOARD_COLORS,
  type BoardColorName,
  type BoardColorName as VestaboardColorName,
  COLOR_CODE_MAP,
  ALL_COLOR_CODES,
  AVAILABLE_COLORS,
  COLOR_DISPLAY,
  getBoardColor,
  getBoardColor as getVestaboardColor,
  isValidBoardColor,
  isValidBoardColor as isValidVestaboardColor,
} from "./board-colors";
