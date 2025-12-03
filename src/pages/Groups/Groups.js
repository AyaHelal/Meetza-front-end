import React, { useState, useEffect } from 'react';
import { MagnifyingGlass, Funnel, CaretDown } from '@phosphor-icons/react';
import { getGroups } from '../../API/auth';
import { smartToast } from '../../API/toastManager';
import './Groups.css';
import api from '../../API/axiosInstance';

const Groups = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYears, setSelectedYears] = useState([1]);
    const [selectedSemesters, setSelectedSemesters] = useState(['Spring']);
    const [expandedYear, setExpandedYear] = useState(true);
    const [expandedSemester, setExpandedSemester] = useState(true);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null); // 'admin' or 'member'
    const [joinedGroups, setJoinedGroups] = useState([]);

    const years = [
        { label: '1st Year', value: 1 },
        { label: '2nd Year', value: 2 },
        { label: '3rd Year', value: 3 },
        { label: '4th Year', value: 4 },
    ];

    const semesters = [
        { label: 'Fall', value: 'Fall' },
        { label: 'Spring', value: 'Spring' },
        { label: 'Summer', value: 'Summer' },
    ];

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

    // Fetch groups and membership
    useEffect(() => {
        const fetchGroupsAndMembership = async () => {
            try {
                setLoading(true);

                let allResults = [];

                if (selectedYears.length > 0 && selectedSemesters.length > 0) {
                    const requests = [];
                    selectedYears.forEach((year) => {
                        selectedSemesters.forEach((semester) => {
                            requests.push(getGroups(year, semester));
                        });
                    });
                    const responses = await Promise.all(requests);
                    allResults = responses.flatMap(res =>
                        Array.isArray(res?.data) ? res.data : res
                    );
                } else {
                    const groupsData = await getGroups();
                    allResults = Array.isArray(groupsData?.data)
                        ? groupsData.data
                        : groupsData;
                }

                // إزالة التكرارات
                const uniqueGroups = allResults.filter(
                    (group, index, self) =>
                        index === self.findIndex(g => (g.group_id || g.id) === (group.group_id || group.id))
                );

                const storedUser =
                    localStorage.getItem("user") ||
                    sessionStorage.getItem("user");
                const userInfo = storedUser ? JSON.parse(storedUser) : null;
                const currentUserId = userInfo?.id;

                const rawRole = (userInfo?.role || 'Member')
                    .toString()
                    .toLowerCase();
                const isAdminRole = rawRole.includes('administrator');
                const normalizedRole = isAdminRole ? 'Administrator' : 'Member';

                const visibleGroups = isAdminRole && currentUserId
                    ? uniqueGroups.filter(
                        group => group.administrator_id === currentUserId
                    )
                    : uniqueGroups;

                setGroups(visibleGroups);
                setUserRole(normalizedRole);

                // تحقق العضويات مباشرة
                if (currentUserId) {
                    const updatedJoinedGroups = await Promise.all(
                        visibleGroups.map(async (group) => {
                            const groupId = group.group_id || group.id;
                            if (!groupId) return null;
                            try {
                                const res = await api.get(`/chat/groups/${groupId}/info`);
                                const members = res.data?.data?.members || [];
                                return members.some(member => member.id === currentUserId)
                                    ? groupId
                                    : null;
                            } catch (err) {
                                console.error('Membership check error:', err);
                                return null;
                            }
                        })
                    );
                    setJoinedGroups(updatedJoinedGroups.filter(id => id !== null));
                }

            } catch (error) {
                console.error('Error fetching groups:', error);
                smartToast.error('Failed to load groups. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchGroupsAndMembership();
    }, [selectedYears, selectedSemesters]);

    const handleJoinGroup = async (groupId) => {
        try {
            const storedUser =
                JSON.parse(localStorage.getItem("user")) ||
                JSON.parse(sessionStorage.getItem("user"));

            if (!storedUser?.id) {
                smartToast.error("You must be logged in to join a group");
                return;
            }

            await api.post("/group-membership/", {
                group_id: groupId,
                member_id: storedUser.id
            });

            setJoinedGroups(prev => [...prev, groupId]);
            smartToast.success("Joined successfully!");

        } catch (error) {
            console.error("Join Error:", error);
            smartToast.error(
                error.response?.data?.message || error.message || "Failed to join group"
            );
        }
    };

    const filteredGroups =
        searchQuery.length >= 3
            ? groups.filter(group =>
                (group.name || group.title || group.group_name || "")
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
            )
            : groups;

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
                                <label key={year.value} className="filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedYears.includes(year.value)}
                                        onChange={() => handleYearToggle(year.value)}
                                    />
                                    <span style={{ color: '#000000' }}>{year.label}</span>
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
                                <label key={semester.value} className="filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedSemesters.includes(semester.value)}
                                        onChange={() => handleSemesterToggle(semester.value)}
                                    />
                                    <span style={{ color: '#000000' }}>{semester.label}</span>
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
                        {filteredGroups.map((group,index) => {
                            const groupId = group.group_id || group.id;
                            return (
                                <div key={groupId || group.name || index} className="group-card">
                                    <div className="group-card-image">
                                        <img
                                            src={group.group_photo || group.photo || "/assets/grp-poster.png"}
                                            alt={group.name || group.title || 'Group'}
                                            onError={(event) => {
                                                event.target.onerror = null;
                                                event.target.src = "/assets/grp-poster.png";
                                            }}
                                        />
                                    </div>
                                    <div className="group-card-body">
                                        <div className="group-card-title">{group.name || group.title || group.group_name || group.content_name}</div>
                                        {userRole === 'Member' && groupId && (
                                            <>
                                                <div className="group-card-instructor">
                                                    {`Dr. ${group.admin?.name || group.admin_name || 'Unknown'}`}
                                                </div>
                                                <button
                                                    className={`group-join-btn py-2 w-50 align-items-center ${
                                                        joinedGroups.includes(groupId) ? "joined" : ""
                                                    }`}
                                                    onClick={() => handleJoinGroup(groupId)}
                                                    disabled={joinedGroups.includes(groupId)}
                                                >
                                                    {joinedGroups.includes(groupId) ? "Joined" : "Join"}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Groups;
