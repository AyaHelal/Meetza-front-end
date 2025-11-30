import React, { useState, useEffect } from 'react';
import { MagnifyingGlass, Funnel, CaretDown } from '@phosphor-icons/react';
import { getGroups } from '../../API/auth';
import { smartToast } from '../../API/toastManager';
import './Groups.css';

const Groups = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYears, setSelectedYears] = useState(['3rd Year']);
    const [selectedSemesters, setSelectedSemesters] = useState(['2nd semester']);
    const [expandedYear, setExpandedYear] = useState(true);
    const [expandedSemester, setExpandedSemester] = useState(true);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null); // 'admin' or 'member'

    const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
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

    // Fetch groups data
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const groupsData = await getGroups();
                const storedUser =
                    localStorage.getItem("user") ||
                    sessionStorage.getItem("user");
                const userInfo = storedUser ? JSON.parse(storedUser) : null;
                const currentUserId = userInfo?.id;
                const rawRole = (userInfo?.role || 'Member').toString().toLowerCase();
                const isAdminRole = rawRole.includes('administrator');
                const normalizedRole = isAdminRole ? 'Administrator' : 'Member';


                const payload = groupsData?.data ?? groupsData;
                const resolvedGroups = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.groups)
                        ? payload.groups
                        : [];

                const visibleGroups = isAdminRole && currentUserId
                    ? resolvedGroups.filter(group => group.administrator_id === currentUserId)
                    : resolvedGroups;

                setGroups(visibleGroups);
                setUserRole(normalizedRole);
            } catch (error) {
                console.error('Error fetching groups:', error);
                smartToast.error('Failed to load groups. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchGroups();
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
                {loading ? (
                    <div className="loading-container">
                        <p>Loading groups...</p>
                    </div>
                ) : (
                    <div className="groups-grid">
                        {groups.map((group) => (
                            <div key={group.id} className="group-card">
                                <div className="group-card-image">
                                    <img
                                        src={group.group_photo || group.photo || "/assets/grp-poster.png"}
                                        alt={group.name || group.title || 'Group'}
                                        onError={(event) => {
                                            event.target.onerror = null;
                                            event.target.src = "/assets/grp-poster.png";
                                        }}
                                    />
                                    {/* <div className="group-card-overlay">
                                        <span className="group-name-banner">GRACIE ABRAMS</span>
                                    </div> */}
                                </div>
                                <div className="group-card-body">
                                    <div className="group-card-title">{group.name || group.title || group.group_name || group.content_name}</div>
                                    {userRole === 'Member' && (
                                        <>
                                            <div className="group-card-instructor">
                                                {`Dr. ${group.administrator?.name || group.administrator_name || 'Unknown'}`}
                                            </div>
                                            <button className="group-join-btn py-2 w-50 align-items-center">Join</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Groups;

