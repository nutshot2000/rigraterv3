import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';

type VirtualizedGridProps<T> = {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    onEndReached?: () => void;
};

const GAP = 24; // px, approximates Tailwind gap-6

function useContainerSize() {
    const ref = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 600 });
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry && entry.contentRect) {
                setSize(s => ({ width: entry.contentRect.width, height: s.height }));
            }
        });
        ro.observe(el);
        const onResize = () => {
            const h = Math.max(400, window.innerHeight - 280);
            setSize(s => ({ width: s.width, height: h }));
        };
        onResize();
        window.addEventListener('resize', onResize);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', onResize);
        };
    }, []);
    return { ref, width: size.width, height: size.height } as const;
}

export default function VirtualizedGrid<T>({ items, itemHeight, renderItem, onEndReached }: VirtualizedGridProps<T>) {
    const { ref, width, height } = useContainerSize();

    const columnCount = useMemo(() => {
        if (width >= 1280) return 4;
        if (width >= 1024) return 3;
        if (width >= 768) return 2;
        return 1;
    }, [width]);

    const innerWidth = Math.max(1, width - (columnCount - 1) * GAP);
    const columnWidth = Math.floor(innerWidth / columnCount);
    const rowCount = Math.ceil(items.length / columnCount);

    const Item = useCallback(({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
        const index = rowIndex * columnCount + columnIndex;
        if (index >= items.length) return null;
        return (
            <div style={{ ...style, left: (style.left as number) + columnIndex * GAP, top: (style.top as number) + rowIndex * GAP, width: columnWidth, height: itemHeight }}>
                <div className="h-full">
                    {renderItem(items[index], index)}
                </div>
            </div>
        );
    }, [items, columnCount, columnWidth, itemHeight, renderItem]);

    const handleItemsRendered = useCallback((info: { visibleRowStopIndex: number }) => {
        if (!onEndReached) return;
        if (rowCount === 0) return;
        if (info.visibleRowStopIndex >= rowCount - 2) {
            onEndReached();
        }
    }, [onEndReached, rowCount]);

    return (
        <div ref={ref} className="w-full">
            {width > 0 && (
                <Grid
                    columnCount={columnCount}
                    columnWidth={columnWidth}
                    height={height}
                    rowCount={rowCount}
                    rowHeight={itemHeight}
                    width={width}
                    onItemsRendered={({ visibleRowStopIndex }) => handleItemsRendered({ visibleRowStopIndex })}
                    style={{ overflowX: 'hidden' }}
                >
                    {Item as any}
                </Grid>
            )}
        </div>
    );
}


