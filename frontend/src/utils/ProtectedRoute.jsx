import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    // Check the Token on localStorage 
    const token = localStorage.getItem('accessToken');

    // Navigate to login page 
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // If has Token, Display the page 
    return children;
};

export default ProtectedRoute;