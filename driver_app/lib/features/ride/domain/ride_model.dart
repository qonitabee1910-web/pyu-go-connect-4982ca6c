enum RideStatus {
  pending,
  accepted,
  inProgress,
  completed,
  cancelled,
}

class RideModel {
  final String id;
  final String riderId;
  final String? driverId;
  final double pickupLat;
  final double pickupLng;
  final String? pickupAddress;
  final double dropoffLat;
  final double dropoffLng;
  final String? dropoffAddress;
  final double fare;
  final double distanceKm;
  final RideStatus status;
  final String serviceType;
  final DateTime createdAt;

  RideModel({
    required this.id,
    required this.riderId,
    this.driverId,
    required this.pickupLat,
    required this.pickupLng,
    this.pickupAddress,
    required this.dropoffLat,
    required this.dropoffLng,
    this.dropoffAddress,
    required this.fare,
    required this.distanceKm,
    required this.status,
    required this.serviceType,
    required this.createdAt,
  });

  factory RideModel.fromJson(Map<String, dynamic> json) {
    return RideModel(
      id: json['id'],
      riderId: json['rider_id'],
      driverId: json['driver_id'],
      pickupLat: (json['pickup_lat'] as num).toDouble(),
      pickupLng: (json['pickup_lng'] as num).toDouble(),
      pickupAddress: json['pickup_address'],
      dropoffLat: (json['dropoff_lat'] as num).toDouble(),
      dropoffLng: (json['dropoff_lng'] as num).toDouble(),
      dropoffAddress: json['dropoff_address'],
      fare: (json['fare'] as num).toDouble(),
      distanceKm: (json['distance_km'] as num).toDouble(),
      status: RideStatus.values.byName(json['status']),
      serviceType: json['service_type'] ?? 'car',
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'rider_id': riderId,
      'driver_id': driverId,
      'pickup_lat': pickupLat,
      'pickup_lng': pickupLng,
      'pickup_address': pickupAddress,
      'dropoff_lat': dropoffLat,
      'dropoff_lng': dropoffLng,
      'dropoff_address': dropoffAddress,
      'fare': fare,
      'distance_km': distanceKm,
      'status': status.name,
      'service_type': serviceType,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
