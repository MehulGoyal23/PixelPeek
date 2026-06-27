import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { FilterParams } from '../types';

interface SearchFiltersProps {
  filters: FilterParams;
  setFilters: React.Dispatch<React.SetStateAction<FilterParams>>;
  cameraModels: string[];
  onReset: () => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  setFilters,
  cameraModels,
  onReset,
}) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      hasGps: e.target.checked ? 'true' : 'all'
    }));
  };

  return (
    <div className="filter-bar">
      {/* Text search */}
      <div className="filter-group-inline search-group">
        <label className="filter-label" htmlFor="q">Search</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            id="q"
            name="q"
            value={filters.q}
            onChange={handleChange}
            placeholder="Search filename or model..."
            className="input-text"
            style={{ paddingLeft: '2.2rem' }}
          />
          <Search 
            size={14} 
            className="text-muted" 
            style={{ 
              position: 'absolute', 
              left: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)' 
            }} 
          />
        </div>
      </div>

      <div className="filter-divider"></div>

      {/* Camera Model filter */}
      <div className="filter-group-inline model-group">
        <label className="filter-label" htmlFor="cameraModel">Camera Model</label>
        <select
          id="cameraModel"
          name="cameraModel"
          value={filters.cameraModel}
          onChange={handleChange}
          className="select-custom"
        >
          <option value="">All Models</option>
          {cameraModels.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      <div className="filter-divider"></div>

      {/* Date taken range */}
      <div className="filter-group-inline date-group">
        <label className="filter-label" htmlFor="dateFrom">Date From</label>
        <input
          type="date"
          id="dateFrom"
          name="dateFrom"
          value={filters.dateFrom}
          onChange={handleChange}
          className="input-text"
          aria-label="Start Date"
        />
      </div>

      <div className="filter-group-inline date-group">
        <label className="filter-label" htmlFor="dateTo">Date To</label>
        <input
          type="date"
          id="dateTo"
          name="dateTo"
          value={filters.dateTo}
          onChange={handleChange}
          className="input-text"
          aria-label="End Date"
        />
      </div>

      <div className="filter-divider"></div>

      {/* Has GPS checkbox */}
      <div className="filter-group-inline" style={{ justifyContent: 'center', height: '100%', paddingLeft: '0.4rem' }}>
        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '100%', marginTop: '0.8rem' }}>
          <input
            type="checkbox"
            checked={filters.hasGps === 'true'}
            onChange={handleCheckboxChange}
            className="checkbox-custom"
          />
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>GPS ONLY</span>
        </label>
      </div>

      <div className="filter-divider"></div>

      {/* Reset button */}
      <button 
        className="btn btn-secondary btn-sm" 
        onClick={onReset}
        style={{ marginLeft: 'auto' }}
        title="Reset Filters"
      >
        <RotateCcw size={12} /> Reset
      </button>
    </div>
  );
};
