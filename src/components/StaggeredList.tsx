import React from 'react';

interface StaggeredListProps {
  children: React.ReactNode;
  className?: string;
  delayStep?: number; // millisecond delay step, default 50ms
}

export default function StaggeredList({
  children,
  className = "flex flex-col gap-4",
  delayStep = 50
}: StaggeredListProps) {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={className}>
      {childrenArray.map((child, index) => {
        if (!React.isValidElement(child)) return child;

        return (
          <div
            key={index}
            className="animate-stagger-in opacity-0"
            style={{
              animationDelay: `${index * delayStep}ms`
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
