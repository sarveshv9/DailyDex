import React from "react";
import { TimePicker, TimePickerProps } from "../ui/TimePicker";

export type InlineTimePickerProps = TimePickerProps;

export const InlineTimePicker: React.FC<InlineTimePickerProps> = (props) => {
  return <TimePicker {...props} />;
};

export default InlineTimePicker;
