import React, { createContext, useContext, useState, useEffect } from 'react';

const PrivacyContext = createContext();

export const usePrivacy = () => {
    const context = useContext(PrivacyContext);
    if (!context) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
};

export const PrivacyProvider = ({ children }) => {
    const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
        const saved = localStorage.getItem('privacyMode');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('privacyMode', isPrivacyMode.toString());
    }, [isPrivacyMode]);

    const togglePrivacyMode = () => {
        setIsPrivacyMode(prev => !prev);
    };

    return (
        <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
            {children}
        </PrivacyContext.Provider>
    );
};
