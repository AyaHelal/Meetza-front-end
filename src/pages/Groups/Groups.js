import React, { useState, useEffect } from 'react';
import { MagnifyingGlass, Funnel, CaretDown } from '@phosphor-icons/react';
import { smartToast } from '../../API/toastManager';
import './Groups.css';
import api from '../../API/axiosInstance';
import Select from 'react-select';

const Groups = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYears, setSelectedYears] = useState([]);
    const [selectedSemesters, setSelectedSemesters] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [expandedYear, setExpandedYear] = useState(!isMobile);
    const [expandedSemester, setExpandedSemester] = useState(!isMobile);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null); // 'admin' or 'member'
    const [joinedGroups, setJoinedGroups] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [positions, setPositions] = useState([]);
    const [formData, setFormData] = useState({
        group_name: '',
        position_id: '',
        year: '',
        semester: '',
        group_content_name: '',
        content_description: '',
        description: '',
        group_photo: null
    });

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

    const handleCreateGroup = async (groupData) => {
    try {
        const storedUser = JSON.parse(localStorage.getItem("user")) ||
                            JSON.parse(sessionStorage.getItem("user"));

        if (!storedUser?.id) {
            smartToast.error("You must be logged in to create a group");
            return;
        }

        const formData = new FormData();
        formData.append('group_name', groupData.name);
        formData.append('year', groupData.year);
        formData.append('semester', groupData.semester);
        formData.append('position_id', groupData.position_id);  // Changed from position to position_id
        formData.append('group_content_name', groupData.content_name);
        if (groupData.content_description) formData.append('group_content_description', groupData.content_description);
        if (groupData.description) formData.append('description', groupData.description);
        if (groupData.photo) formData.append('group_photo', groupData.photo);
        formData.append('admin_id', storedUser.id);

        const response = await api.post('/group', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        smartToast.success('Group created successfully!');
        setShowCreateModal(false);
        // Refresh groups list with proper filtering
        await fetchGroupsAndMembership();

    } catch (error) {
        console.error('Error creating group:', error);
        smartToast.error(error.response?.data?.message || 'Failed to create group');
    }
};

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

    useEffect(() => {
    const fetchPositions = async () => {
        try {
            const response = await api.get('/position');
            const positionsData = Array.isArray(response.data)
                ? response.data
                : response.data?.data || [];
            setPositions(positionsData);
        } catch (error) {
            // 403 is expected for non-admin users
            if (error.response?.status !== 403) {
                console.error('Error fetching positions:', error);
            }
            // Only show error for administrators, not for members
            const storedUser = JSON.parse(localStorage.getItem("user")) ||
                                JSON.parse(sessionStorage.getItem("user"));
            const rawRole = (storedUser?.role || 'Member')
                .toString()
                .toLowerCase();
            const isAdminRole = rawRole.includes('administrator');
            if (isAdminRole) {
                smartToast.error('Failed to load positions');
            }
        }
    };

    fetchPositions();
}, []);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            // Close filters on mobile, open on desktop
            if (mobile) {
                setExpandedYear(false);
                setExpandedSemester(false);
            } else {
                setExpandedYear(true);
                setExpandedSemester(true);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Add class to body when Groups is mounted
    useEffect(() => {
        document.documentElement.classList.add('group-chat-active');
        document.body.classList.add('group-chat-active');

        return () => {
            document.documentElement.classList.remove('group-chat-active');
            document.body.classList.remove('group-chat-active');
        };
    }, []);

    const fetchGroupsAndMembership = async () => {
        try {
            let allResults = [];

            const params = new URLSearchParams();

            // Year selected
            if (selectedYears.length > 0) {
            params.append("year", selectedYears[0]);
            }

            // Semester selected
            if (selectedSemesters.length > 0) {
            params.append("semester", selectedSemesters[0]);
            }

            // Final request
            let groupsResponse;

            if (params.toString()) {
            groupsResponse = await api.get(`/group?${params.toString()}`);
            } else {
            groupsResponse = await api.get(`/group`);
            }

            // Extract data - ensure we always get an array
            if (Array.isArray(groupsResponse?.data?.data)) {
                allResults = groupsResponse.data.data;
            } else if (Array.isArray(groupsResponse?.data)) {
                allResults = groupsResponse.data;
            } else if (groupsResponse?.data?.success && Array.isArray(groupsResponse?.data?.data)) {
                allResults = groupsResponse.data.data;
            } else if (groupsResponse?.data?.success && Array.isArray(groupsResponse?.data?.groups)) {
                allResults = groupsResponse.data.groups;
            } else {
                // Fallback: ensure allResults is always an array
                console.warn('Unexpected response structure:', groupsResponse?.data);
                allResults = [];
            }



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
            console.log('Raw role:', rawRole, 'User info:', userInfo);
            const isAdminRole = rawRole.includes('administrator');
            const isSuperAdminRole = (rawRole.includes('super') && rawRole.includes('admin')) || rawRole.includes('Super_Admin');
            const normalizedRole = isSuperAdminRole ? 'Super_Admin' : (isAdminRole ? 'Administrator' : 'Member');
            console.log('Normalized role:', normalizedRole);

            const visibleGroups = isSuperAdminRole
                ? uniqueGroups
                : (isAdminRole && currentUserId
                    ? uniqueGroups.filter(
                        group => group.administrator_id === currentUserId
                    )
                    : uniqueGroups);

            setGroups(visibleGroups);
            setUserRole(normalizedRole);

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
                            // 403 is expected for groups the user isn't a member of
                            if (err.response?.status !== 403) {
                                console.error('Membership check error:', err);
                            }
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

    // Fetch groups and membership
    useEffect(() => {
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



    const handleContentChange = (e) => {
        const { name, value, type, files } = e.target;

        let newValue;
        if (type === 'file') {
            newValue = (files && files.length > 0) ? files[0] : null;
        } else {
            newValue = value === "" ? null : type === "number" ? Number(value) : value;
        }

        setFormData({
            ...formData,
            [name]: newValue
        });
    };

    const handleCreateGroupSubmit = async () => {
        if (!formData.group_name || !formData.position_id || !formData.year || !formData.semester || !formData.group_content_name) {
            smartToast.error("Please fill all required fields: group name, position, year, semester and content name");
            return;
        }

        try {
            await handleCreateGroup({
                name: formData.group_name,
                year: formData.year,
                semester: formData.semester,
                position_id: formData.position_id,
                content_name: formData.group_content_name,
                content_description: formData.content_description,
                description: formData.description,
                photo: formData.group_photo
            });
            setFormData({
                group_name: '',
                position_id: '',
                year: '',
                semester: '',
                group_content_name: '',
                content_description: '',
                description: '',
                group_photo: null
            });
        } catch (error) {
            console.error('Error creating group:', error);
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
                <div className="groups-header">
                    <h1 className="groups-title">Groups</h1>
                    {userRole === 'Administrator' && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="create-group-btn"
                            >
                                <span>+</span> Create Group
                            </button>
                        )}
                </div>
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
                                        {(userRole === 'Member' || userRole === 'Super_Admin') && (
                                            <div className="group-card-instructor">
                                                {`Dr. ${group.admin?.name || group.admin_name || 'Unknown'}`}
                                            </div>
                                        )}
                                        {userRole === 'Member' && groupId && (
                                            <button
                                                className={`group-join-btn py-2 w-50 align-items-center ${
                                                    joinedGroups.includes(groupId) ? "joined" : ""
                                                }`}
                                                onClick={() => handleJoinGroup(groupId)}
                                                disabled={joinedGroups.includes(groupId)}
                                            >
                                                {joinedGroups.includes(groupId) ? "Joined" : "Join"}
                                            </button>
                                        )}

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Group</h3>
                            <button onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="row justify-content-center">
                                <div className="col-lg-10 col-md-12 col-sm-12 panelcard">
                                        <div className="mb-0 lg-mb-4 pading">
                                            <label className="form-label fw-semibold" style={{ color: "#010101", fontSize: "16px" }}>
                                                Group Name <span style={{ color: "#FF0000" }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control rounded-3 size mb-3"
                                                name="group_name"
                                                value={formData.group_name || ''}
                                                onChange={handleContentChange}
                                                placeholder="Enter group name"
                                                style={{
                                                    border: "2px solid #E9ECEF",
                                                    fontSize: "16px",
                                                }}
                                            />
                                        </div>

                                        <div className="mb-0 lg-mb-4">
                                            <label className="form-label fw-semibold" style={{ color: "#010101", fontSize: "16px" }}>
                                                Position <span style={{ color: "#FF0000" }}>*</span>
                                            </label>
                                            <Select
                                                className="rounded-3 size mb-3"
                                                options={positions.map(p => ({
                                                    value: p.id,
                                                    label: p.name || p.position_name || p.title || `Position ${p.id}`
                                                }))}
                                                value={positions.find(p => String(p.id) === String(formData.position_id)) ? {
                                                    value: positions.find(p => String(p.id) === String(formData.position_id)).id,
                                                    label: positions.find(p => String(p.id) === String(formData.position_id)).name || positions.find(p => String(p.id) === String(formData.position_id)).position_name || positions.find(p => String(p.id) === String(formData.position_id)).title || `Position ${positions.find(p => String(p.id) === String(formData.position_id)).id}`
                                                } : null}
                                                onChange={(opt) => setFormData({ ...formData, position_id: opt?.value ?? '' })}
                                                placeholder="Select a position"
                                                menuPortalTarget={document.body}
                                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                            />
                                        </div>

                                        <div className="mb-4">
                                                <label className="form-label fw-semibold" style={{ color: "#010101", fontSize: "16px"  }}>
                                                    Year <span style={{ color: "#FF0000" }}>*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-control rounded-3 mb-3 size"
                                                    name="year"
                                                    min={1}
                                                    value={formData.year || ''}
                                                    onChange={handleContentChange}
                                                    placeholder="Enter year"
                                                    style={{
                                                        border: "2px solid #E9ECEF",
                                                        fontSize: "16px",
                                                    }}
                                                />
                                                <div className="p-0 mb-4">
                                                    <label className="form-label fw-semibold" style={{ color: "#010101", fontSize: "16px" }}>
                                                        Semester <span style={{ color: "#FF0000" }}>*</span>
                                                    </label>
                                                    <Select
                                                        options={[{ value: 'Fall', label: 'Fall' }, { value: 'Spring', label: 'Spring' }, { value: 'Summer', label: 'Summer' }]}
                                                        value={formData.semester ? { value: formData.semester, label: formData.semester } : null}
                                                        onChange={(opt) => setFormData({ ...formData, semester: opt?.value ?? '' })}
                                                        placeholder="Select semester"
                                                        menuPortalTarget={document.body}
                                                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                    />
                                                </div>

                                        <div className="p-0 mb-4">
                                            <label className="form-label fw-semibold" style={{ color: "#010101", fontSize: "16px" }}>
                                                Content Name <span style={{ color: "#FF0000" }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control rounded-3"
                                                name="group_content_name"
                                                value={formData.group_content_name || ''}
                                                onChange={handleContentChange}
                                                placeholder="Enter content name"
                                                style={{
                                                    border: "2px solid #E9ECEF",
                                                    fontSize: "16px",
                                                }}
                                            />
                                        </div>

                                        <div className="p-0 mb-4">
                                            <label className="form-label fw-semibold" style={{ color: "#010101", fontSize: "16px" }}>
                                                Content Description
                                            </label>
                                            <textarea
                                                className="form-control rounded-3"
                                                name="content_description"
                                                value={formData.content_description || ''}
                                                onChange={handleContentChange}
                                                placeholder="Enter content description (optional)"
                                                style={{
                                                    border: "2px solid #E9ECEF",
                                                    fontSize: "16px",
                                                    minHeight: 90,
                                                }}
                                            />
                                        </div>

                                        <div className="p-0 mb-4">
                                            <label className="form-label fw-semibold" style={{ color: "#010101", fontSize: "16px" }}>
                                                Description
                                            </label>
                                            <textarea
                                                className="form-control rounded-3"
                                                name="description"
                                                value={formData.description || ''}
                                                onChange={handleContentChange}
                                                placeholder="Enter group description (optional)"
                                                style={{
                                                    border: "2px solid #E9ECEF",
                                                    fontSize: "16px",
                                                    minHeight: 90,
                                                }}
                                            />
                                        </div>

                                        <div className="p-0 mb-4">
                                            <label className="form-label fw-semibold" style={{ color: "#010101", fontSize: "16px" }}>
                                                Poster (upload image)
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="form-control"
                                                name="group_photo"
                                                onChange={handleContentChange}
                                            />
                                            {formData.group_photo && (
                                                <div style={{ marginTop: 8 }}>
                                                    <small>Selected file: {formData.group_photo.name}</small>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-center">
                                            <button
                                                type="button"
                                                className="btn rounded-3 px-5 py-2"
                                                onClick={handleCreateGroupSubmit}
                                                style={{
                                                    background: "#0076EA",
                                                    color: "white",
                                                    border: "none",
                                                    fontSize: "16px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Create Group
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Groups;
