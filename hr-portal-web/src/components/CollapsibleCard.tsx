import React, { useState } from 'react';

export const CollapsibleCard: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpenMobile?: boolean;
  style?: React.CSSProperties;
  className?: string;
  actionButton?: React.ReactNode;
}> = ({ title, children, defaultOpenMobile = false, style = {}, className = '', actionButton }) => {
  const [isOpen, setIsOpen] = useState(defaultOpenMobile);
  return (
    <div className={`glass-panel collapsible-mobile-card ${isOpen ? 'is-mobile-open' : ''} ${className}`} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '300px', ...style }}>
      <div className="collapsible-card-header" onClick={() => setIsOpen(!isOpen)} style={{ gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, flexShrink: 0 }}>{title}</h3>
        {actionButton && (
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}
            className="collapsible-header-action"
          >
            {actionButton}
          </div>
        )}
        <div className="collapsible-toggle-chevron">
          <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>
      <div className="collapsible-card-body">
        {children}
      </div>
    </div>
  );
};

export default CollapsibleCard;
