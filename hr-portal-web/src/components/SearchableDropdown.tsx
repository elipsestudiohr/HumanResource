import React, { useState, useEffect, useRef } from 'react';

interface SearchableDropdownProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  onAddClick: () => void;
}

export default function SearchableDropdown({
  label,
  placeholder,
  value,
  onChange,
  options,
  onAddClick
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search to match actual selected value if user exits without choosing
        setSearch(value);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val); // Sync back immediately
    setIsOpen(true);
  };

  const handleOptionClick = (option: string) => {
    setSearch(option);
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={search}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            style={{ width: '100%', paddingRight: '32px' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                onChange('');
                setIsOpen(true);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.1rem',
                cursor: 'pointer',
                padding: '0'
              }}
            >
              ×
            </button>
          )}
        </div>
        
        <button
          type="button"
          onClick={onAddClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-surface-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            width: '45px',
            height: '45px',
            cursor: 'pointer',
            fontSize: '1.25rem',
            color: 'var(--text-primary)',
            transition: 'all var(--transition-fast)'
          }}
          title={`Add new ${label.toLowerCase()}`}
          className="btn-secondary-hover"
        >
          +
        </button>
      </div>

      {isOpen && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: '53px', // align perfectly matching the input width
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '180px',
            overflowY: 'auto',
            zIndex: 999,
            listStyle: 'none',
            padding: '4px 0',
            margin: 0,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)'
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, idx) => (
              <li
                key={idx}
                onClick={() => handleOptionClick(option)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  transition: 'background var(--transition-fast)'
                }}
                className="dropdown-item-hover"
              >
                {option}
              </li>
            ))
          ) : (
            <li
              style={{
                padding: '10px 14px',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic'
              }}
            >
              No options match. Click + to add new.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
