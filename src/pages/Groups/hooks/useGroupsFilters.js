import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useGroupsFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedSemesters, setSelectedSemesters] = useState([]);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT);
  const [expandedYear, setExpandedYear] = useState(!(typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT));
  const [expandedSemester, setExpandedSemester] = useState(!(typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT));

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      setExpandedYear(!mobile);
      setExpandedSemester(!mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleYearToggle = (year) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleSemesterToggle = (semester) => {
    setSelectedSemesters((prev) =>
      prev.includes(semester) ? prev.filter((s) => s !== semester) : [...prev, semester]
    );
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedYears,
    selectedSemesters,
    isMobile,
    expandedYear,
    setExpandedYear,
    expandedSemester,
    setExpandedSemester,
    handleYearToggle,
    handleSemesterToggle,
  };
}
