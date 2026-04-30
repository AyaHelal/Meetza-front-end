import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../API/axiosInstance';

export const BrandingContext = createContext();

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState({
        systemName: 'Meetza',
        systemNameColor: '#2c3e50',
        logoUrl: '',
        showPoweredBy: true,
        theme: 'light',
        termsHtml: '',
        privacyHtml: '',
        guidelinesHtml: '',
        authGoogleEnabled: true,
        domains: [],
        loading: true
    });

    const fetchBranding = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const res = await axios.get(`${API_BASE_URL}/companies/id`, { headers });
            const data = res.data?.data || res.data;
            const settings = data?.settings || {};
            
            if (data && typeof data === 'object') {
                setBranding({
                    systemName: settings.system_name || data.name || 'Meetza',
                    systemNameColor: settings.system_name_color || '#2c3e50',
                    logoUrl: settings.logo_url || '',
                    showPoweredBy: true,
                    theme: settings.theme || 'light',
                    termsHtml: settings.terms_html || '',
                    privacyHtml: settings.privacy_html || '',
                    guidelinesHtml: settings.guidelines_html || '',
                    authGoogleEnabled: settings.auth_google_enabled !== false && settings.auth_google_enabled !== 0 && settings.auth_google_enabled !== '0',
                    domains: data.domains || [],
                    loading: false
                });
                
                if (data.id) {
                    localStorage.setItem('currentCompanyId', data.id);
                }
            } else {
                setBranding(prev => ({ ...prev, loading: false }));
            }
        } catch (error) {
            console.error('Branding fetch error:', error);
            setBranding(prev => ({ ...prev, loading: false }));
        }
    }, []);

    useEffect(() => {
        fetchBranding();
    }, [fetchBranding]);

    const updateBranding = (newData) => {
        setBranding(prev => ({
            ...prev,
            ...newData
        }));
    };

    return (
        <BrandingContext.Provider value={{ ...branding, refreshBranding: fetchBranding, updateBranding }}>
            {children}
        </BrandingContext.Provider>
    );
};
