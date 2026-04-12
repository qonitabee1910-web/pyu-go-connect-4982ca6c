import 'package:supabase_flutter/supabase_flutter.dart';
import 'ride_model.dart';

class RideRepository {
  final SupabaseClient _supabase = Supabase.instance.client;

  Future<void> updateRideStatus(String rideId, RideStatus status) async {
    await _supabase
        .from('rides')
        .update({'status': status.name})
        .eq('id', rideId);
  }

  Future<void> acceptRide(String rideId, String driverId) async {
    await _supabase
        .from('rides')
        .update({
          'status': RideStatus.accepted.name,
          'driver_id': driverId,
        })
        .eq('id', rideId);
    
    // Also update driver status to busy
    await _supabase
        .from('drivers')
        .update({'status': 'busy'})
        .eq('id', driverId);
  }

  Future<void> completeRide(String rideId, String driverId) async {
    // Invoke edge function for payment processing and finishing
    await _supabase.functions.invoke('complete-ride', body: {
      'ride_id': rideId,
    });
    
    // Update driver status back to available
    await _supabase
        .from('drivers')
        .update({'status': 'available'})
        .eq('id', driverId);
  }

  Stream<List<RideModel>> watchIncomingRides(String driverId) {
    return _supabase
        .from('rides')
        .stream(primaryKey: ['id'])
        .eq('driver_id', driverId)
        .order('created_at')
        .map((data) => data.map((json) => RideModel.fromJson(json)).toList());
  }
}
