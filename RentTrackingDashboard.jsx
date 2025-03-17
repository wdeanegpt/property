import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import RentTrackingWidget from './widgets/RentTrackingWidget';
import LateFeeManagementWidget from './widgets/LateFeeManagementWidget';
import './RentTrackingDashboard.css';

/**
 * Rent Tracking Dashboard Component
 * 
 * This component serves as the main dashboard for rent tracking functionality,
 * combining various widgets related to rent tracking and late fee management.
 */
const RentTrackingDashboard = ({ propertyId }) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch property details
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        // In a real implementation, this would be an API call
        // For now, we'll simulate it with a timeout
        setTimeout(() => {
          setProperty({
            id: propertyId,
            name: 'Sample Property',
            address: '123 Main Street, Anytown, USA',
            units: 24,
            occupiedUnits: 22
          });
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Error fetching property details:', err);
        setError('Failed to load property details');
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [propertyId]);

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <Container fluid className="rent-tracking-dashboard">
      <div className="dashboard-header">
        <h2>{property.name}</h2>
        <p>{property.address}</p>
        <div className="property-stats">
          <span>Units: {property.units}</span>
          <span>Occupied: {property.occupiedUnits}</span>
          <span>Occupancy Rate: {((property.occupiedUnits / property.units) * 100).toFixed(1)}%</span>
        </div>
      </div>

      <Row>
        <Col lg={12}>
          <RentTrackingWidget propertyId={propertyId} />
        </Col>
      </Row>

      <Row>
        <Col lg={12}>
          <LateFeeManagementWidget propertyId={propertyId} />
        </Col>
      </Row>

      <Row className="dashboard-footer">
        <Col>
          <p>Last updated: {new Date().toLocaleString()}</p>
        </Col>
      </Row>
    </Container>
  );
};

export default RentTrackingDashboard;
