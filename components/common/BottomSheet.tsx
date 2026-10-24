import React from "react";
import { ModalSheet, ModalSheetProps } from "../ui/ModalSheet";

export type BottomSheetProps = ModalSheetProps;

/**
 * Standard Zen BottomSheet Component (delegates to consolidated ModalSheet)
 */
export const BottomSheet: React.FC<BottomSheetProps> = (props) => {
  return <ModalSheet {...props} />;
};

export default BottomSheet;
