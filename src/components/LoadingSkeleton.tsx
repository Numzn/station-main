import React from 'react';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  height = 'h-4',
  width = 'w-full',
  animate = true,
}) => {
  return (
    <div
      className={`bg-gray-200 rounded ${height} ${width} ${
        animate ? 'animate-pulse' : ''
      } ${className}`}
    />
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {Array(columns)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-8" />
          ))}
      </div>
      {Array(rows)
        .fill(0)
        .map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-4">
            {Array(columns)
              .fill(0)
              .map((_, colIndex) => (
                <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-6" />
              ))}
          </div>
        ))}
    </div>
  );
};

interface CardSkeletonProps {
  lines?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ lines = 3 }) => {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <Skeleton className="h-6 w-3/4" />
      {Array(lines)
        .fill(0)
        .map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
    </div>
  );
};

export default {
  Base: Skeleton,
  Table: TableSkeleton,
  Card: CardSkeleton,
};
