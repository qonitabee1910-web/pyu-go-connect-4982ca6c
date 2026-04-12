import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class LocationService {
  final SupabaseClient _supabase = Supabase.instance.client;
  StreamSubscription<Position>? _positionStream;

  Future<void> startLocationTracking() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    if (permission == LocationPermission.deniedForever) return;

    // Start background tracking
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // Update every 10 meters
      ),
    ).listen((Position position) {
      _updateDriverLocation(position);
    });
  }

  Future<void> _updateDriverLocation(Position position) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return;

    try {
      await _supabase.from('drivers').update({
        'current_lat': position.latitude,
        'current_lng': position.longitude,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('user_id', userId);
    } catch (e) {
      debugPrint('Error updating location: $e');
    }
  }

  void stopLocationTracking() {
    _positionStream?.cancel();
    _positionStream = null;
  }
}
