import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../API/axiosInstance';

const BrandingContext = createContext();

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState({
        systemName: 'Meetza',
        logoUrl: '',
        showPoweredBy: true,
        loading: true
    });

    useEffect(() => {
        let cancelled = false;
        axiosInstance.get('/settings')
            .then(res => {
                if (cancelled) return;
                const data = res.data?.data || res.data;
                if (data && typeof data === 'object') {
                    setBranding({
                        systemName: data.systemName || data.system_name || 'Meetza',
                        logoUrl: data.logoUrl || data.logo_url || '',
                        showPoweredBy: data.showPoweredBy ?? data.show_powered_by ?? true,
                        loading: false
                    });
                } else {
                    setBranding(prev => ({ ...prev, loading: false }));
                }
            })
            .catch(() => {
                if (cancelled) return;
                setBranding(prev => ({ ...prev, loading: false }));
            });

        return () => { cancelled = true; };
    }, []);

    return (
        <BrandingContext.Provider value={branding}>
            {children}
        </BrandingContext.Provider>
    );
};
