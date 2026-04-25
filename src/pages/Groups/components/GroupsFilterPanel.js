import React from 'react';
import { MagnifyingGlass, Funnel, CaretDown } from '@phosphor-icons/react';
import { YEARS, SEMESTERS } from '../constants';

export default function GroupsFilterPanel({
  searchQuery,
  setSearchQuery,
  selectedYears,
  selectedSemesters,
  expandedYear,
  setExpandedYear,
  expandedSemester,
  setExpandedSemester,
  handleYearToggle,
  handleSemesterToggle,
}) {
  return (
    <div className="filter-panel">
      <div className="filter-header">
        <Funnel size={20} weight="bold" />
        <h3>Filter</h3>
      </div>
      <div className="search-bar">
        <MagnifyingGlass size={20} color="#888888" />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="filter-section">
        <div className="filter-title" onClick={() => setExpandedYear(!expandedYear)}>
          <span className="fw-semibold">Year</span>
          <CaretDown size={16} className={expandedYear ? 'expanded' : ''} />
        </div>
        {expandedYear && (
          <div className="filter-options">
            {YEARS.map((year) => (
              <label key={year.value} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedYears.includes(year.value)}
                  onChange={() => handleYearToggle(year.value)}
                />
                <span>{year.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="filter-section">
        <div className="filter-title" onClick={() => setExpandedSemester(!expandedSemester)}>
          <span className="fw-semibold">Semester</span>
          <CaretDown size={16} className={expandedSemester ? 'expanded' : ''} />
        </div>
        {expandedSemester && (
          <div className="filter-options">
            {SEMESTERS.map((semester) => (
              <label key={semester.value} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSemesters.includes(semester.value)}
                  onChange={() => handleSemesterToggle(semester.value)}
                />
                <span>{semester.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
