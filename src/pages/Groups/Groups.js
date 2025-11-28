import React, { useState, useEffect } from 'react';
import { MagnifyingGlass, Funnel, CaretDown } from '@phosphor-icons/react';
import './Groups.css';

const Groups = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYears, setSelectedYears] = useState(['3rd Year']);
    const [selectedSemesters, setSelectedSemesters] = useState(['2nd semester']);
    const [expandedYear, setExpandedYear] = useState(true);
    const [expandedSemester, setExpandedSemester] = useState(true);

    // Mock data for groups
    const groups = [
        {
            id: 1,
            title: "Title",
            instructor: "Dr Hassan Eslam",
            image: "/assets/grp-poster.png"
        },
        {
            id: 2,
            title: "Title",
            instructor: "Dr Hassan Eslam",
            image: "/assets/grp-poster.png"
        },
        {
            id: 3,
            title: "Title",
            instructor: "Dr Hassan Eslam",
            image: "/assets/grp-poster.png"
        },
        {
            id: 4,
            title: "Title",
            instructor: "Dr Hassan Eslam",
            image: "/assets/grp-poster.png"
        },
        {
            id: 5,
            title: "Title",
            instructor: "Dr Hassan Eslam",
            image: "/assets/grp-poster.png"
        },
        {
            id: 6,
            title: "Title",
            instructor: "Dr Hassan Eslam",
            image: "/assets/grp-poster.png"
        },
        {
            id: 7,
            title: "Title",
            instructor: "Dr Hassan Eslam",
            image: "/assets/grp-poster.png"
        },
        {
            id: 8,
            title: "Title",
            instructor: "Dr Hassan Eslam",
            image: "/assets/grp-poster.png"
        },
        {
            id: 9,
            title: "Title",
            instructor: "Dr Hassan Eslam",
            image: "/assets/grp-poster.png"
        }
    ];

    const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year'];
    const semesters = ['1st semester', '2nd semester'];

    const handleYearToggle = (year) => {
        setSelectedYears(prev =>
            prev.includes(year)
                ? prev.filter(y => y !== year)
                : [...prev, year]
        );
    };

    const handleSemesterToggle = (semester) => {
        setSelectedSemesters(prev =>
            prev.includes(semester)
                ? prev.filter(s => s !== semester)
                : [...prev, semester]
        );
    };

    // Add class to body when Groups is mounted
    useEffect(() => {
        document.documentElement.classList.add('group-chat-active');
        document.body.classList.add('group-chat-active');

        return () => {
            document.documentElement.classList.remove('group-chat-active');
            document.body.classList.remove('group-chat-active');
        };
    }, []);

    return (
        <div className="groups-page">
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
                        <CaretDown
                            size={16}
                            className={expandedYear ? 'expanded' : ''}
                        />
                    </div>
                    {expandedYear && (
                        <div className="filter-options">
                            {years.map((year) => (
                                <label key={year} className="filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedYears.includes(year)}
                                        onChange={() => handleYearToggle(year)}
                                    />
                                    <span style={{ color: '#000000' }}>{year}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="filter-section">
                    <div className="filter-title" onClick={() => setExpandedSemester(!expandedSemester)}>
                        <span className="fw-semibold">Semester</span>
                        <CaretDown
                            size={16}
                            className={expandedSemester ? 'expanded' : ''}
                        />
                    </div>
                    {expandedSemester && (
                        <div className="filter-options">
                            {semesters.map((semester) => (
                                <label key={semester} className="filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedSemesters.includes(semester)}
                                        onChange={() => handleSemesterToggle(semester)}
                                    />
                                    <span style={{ color: '#000000' }}>{semester}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="groups-content">
                <h1 className="groups-title">Groups</h1>
                <div className="groups-grid">
                    {groups.map((group) => (
                        <div key={group.id} className="group-card">
                            <div className="group-card-image">
                                <img src={group.image} alt={group.title} />
                                {/* <div className="group-card-overlay">
                                    <span className="group-name-banner">GRACIE ABRAMS</span>
                                </div> */}
                            </div>
                            <div className="group-card-body">
                                <div className="group-card-title">Title</div>
                                <div className="group-card-instructor">{group.instructor}</div>
                                <button className="group-join-btn py-2 w-50 align-items-center">Join</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Groups;

