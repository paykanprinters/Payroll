"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DropdownProps, useNavigation, CaptionProps } from "react-day-picker";
import { format } from "date-fns"; // Import format

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear, // Destructure fromYear
  toYear,   // Destructure toYear
  ...props
}: CalendarProps) {
  const CustomCaption = ({ displayMonth }: CaptionProps) => {
    const { goToMonth } = useNavigation();
    
    // Use fromYear and toYear passed to the main Calendar component
    const currentFromYear = fromYear || new Date().getFullYear() - 10; // Fallback
    const currentToYear = toYear || new Date().getFullYear() + 10; // Fallback

    return (
      <div className="flex gap-1">
        <Select
          onValueChange={(value) => {
            const newDate = new Date(displayMonth);
            newDate.setMonth(Number(value));
            goToMonth(newDate);
          }}
          value={displayMonth.getMonth().toString()}
        >
          <SelectTrigger className="h-[28px] w-fit text-sm">
            <SelectValue>{format(displayMonth, "MMM")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>
                {format(new Date(displayMonth.getFullYear(), i, 1), "MMM")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value) => {
            const newDate = new Date(displayMonth);
            newDate.setFullYear(Number(value));
            goToMonth(newDate);
          }}
          value={displayMonth.getFullYear().toString()}
        >
          <SelectTrigger className="h-[28px] w-fit text-sm">
            <SelectValue>{format(displayMonth, "yyyy")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: currentToYear - currentFromYear + 1 }, (_, i) => (
              <SelectItem key={i} value={(currentFromYear + i).toString()}>
                {currentFromYear + i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        caption_dropdowns: "flex gap-1",
        vhidden: "hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Dropdown: ({ value, onChange, children, name }: DropdownProps) => {
          const { goToMonth, currentMonth } = useNavigation();
          
          return (
            <Select
              onValueChange={(newValue) => {
                onChange?.({
                  target: { value: newValue },
                } as React.ChangeEvent<HTMLSelectElement>);
              }}
              value={value as string}
            >
              <SelectTrigger className="h-[28px] w-fit text-sm">
                <SelectValue>{children}</SelectValue>
              </SelectTrigger>
              <SelectContent>{children}</SelectContent>
            </Select>
          );
        },
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        Caption: CustomCaption, // Use the custom caption component
      }}
      fromYear={fromYear} // Pass fromYear to DayPicker
      toYear={toYear}     // Pass toYear to DayPicker
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };