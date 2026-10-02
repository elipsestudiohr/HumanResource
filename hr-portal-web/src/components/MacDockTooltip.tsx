import React, { useState, useEffect, useRef } from 'react';

interface TooltipData {
  text: string;
  x: number;
  y: number;
  placement: 'top' | 'bottom';
  visible: boolean;
}

export const MacDockTooltip: React.FC = () => {
  const [data, setData] = useState<TooltipData>({
    text: '',
    x: 0,
    y: 0,
    placement: 'top',
    visible: false
  });
  const currentTargetRef = useRef<HTMLElement | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      if (!target) return;

      let foundText = '';
      let elementWithTooltip: HTMLElement | null = null;

      let el: HTMLElement | null = target;
      while (el && el !== document.body) {
        // 1. Explicit data-mac-tooltip or data-tooltip
        if (el.getAttribute('data-mac-tooltip')) {
          foundText = el.getAttribute('data-mac-tooltip') || '';
          elementWithTooltip = el;
          break;
        }
        if (el.getAttribute('data-tooltip')) {
          foundText = el.getAttribute('data-tooltip') || '';
          elementWithTooltip = el;
          break;
        }
        // 2. Standard title attribute
        if (el.getAttribute('title')) {
          foundText = el.getAttribute('title') || '';
          elementWithTooltip = el;
          el.setAttribute('data-mac-stored-title', foundText);
          el.removeAttribute('title');
          break;
        }
        if (el.getAttribute('data-mac-stored-title')) {
          foundText = el.getAttribute('data-mac-stored-title') || '';
          elementWithTooltip = el;
          break;
        }
        // 3. Overflowing truncated text in table cell or container
        if (
          (el.tagName === 'TD' || el.tagName === 'TH' || el.classList.contains('table-cell-ellipsis') || el.style.textOverflow === 'ellipsis') &&
          el.scrollWidth > el.clientWidth + 2 &&
          el.textContent &&
          el.textContent.trim().length > 0
        ) {
          foundText = el.textContent.trim();
          elementWithTooltip = el;
          break;
        }

        el = el.parentElement;
      }

      if (foundText && elementWithTooltip) {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        currentTargetRef.current = elementWithTooltip;
        const rect = elementWithTooltip.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const topSpace = rect.top;
        const placement = topSpace < 48 ? 'bottom' : 'top';
        const posY = placement === 'top' ? rect.top - 8 : rect.bottom + 8;

        setData({
          text: foundText,
          x: Math.min(Math.max(midX, 24), window.innerWidth - 24),
          y: posY,
          placement,
          visible: true
        });
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (currentTargetRef.current && (currentTargetRef.current === target || !currentTargetRef.current.contains(e.relatedTarget as Node))) {
        if (currentTargetRef.current.getAttribute('data-mac-stored-title')) {
          currentTargetRef.current.setAttribute('title', currentTargetRef.current.getAttribute('data-mac-stored-title') || '');
        }
        currentTargetRef.current = null;
        hideTimeoutRef.current = window.setTimeout(() => {
          setData(prev => ({ ...prev, visible: false }));
        }, 50);
      }
    };

    const handleScrollOrClick = () => {
      if (currentTargetRef.current) {
        if (currentTargetRef.current.getAttribute('data-mac-stored-title')) {
          currentTargetRef.current.setAttribute('title', currentTargetRef.current.getAttribute('data-mac-stored-title') || '');
        }
        currentTargetRef.current = null;
      }
      setData(prev => (prev.visible ? { ...prev, visible: false } : prev));
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('scroll', handleScrollOrClick, true);
    window.addEventListener('click', handleScrollOrClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('scroll', handleScrollOrClick, true);
      window.removeEventListener('click', handleScrollOrClick, true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  if (!data.visible && !data.text) return null;

  return (
    <div
      className={`mac-dock-tooltip-pill ${data.placement} ${data.visible ? 'visible' : ''}`}
      style={{
        left: `${data.x}px`,
        top: `${data.y}px`
      }}
      aria-hidden="true"
    >
      <div className="mac-dock-tooltip-content">
        {data.text}
      </div>
      <div className={`mac-dock-tooltip-arrow ${data.placement}`} />
    </div>
  );
};

export default MacDockTooltip;
