import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/ride_model.dart';

class RideTrackingPage extends StatefulWidget {
  final String rideId;
  const RideTrackingPage({super.key, required this.rideId});

  @override
  State<RideTrackingPage> createState() => _RideTrackingPageState();
}

class _RideTrackingPageState extends State<RideTrackingPage> {
  final SupabaseClient _supabase = Supabase.instance.client;
  GoogleMapController? _mapController;
  RideModel? _ride;
  LatLng? _driverLocation;

  @override
  void initState() {
    super.initState();
    _subscribeToRideUpdates();
  }

  void _subscribeToRideUpdates() {
    _supabase
        .from('rides')
        .stream(primaryKey: ['id'])
        .eq('id', widget.rideId)
        .listen((data) {
          if (data.isNotEmpty) {
            setState(() {
              _ride = RideModel.fromJson(data.first);
            });
            if (_ride?.driverId != null) {
              _subscribeToDriverLocation(_ride!.driverId!);
            }
          }
        });
  }

  void _subscribeToDriverLocation(String driverId) {
    _supabase
        .from('drivers')
        .stream(primaryKey: ['id'])
        .eq('id', driverId)
        .listen((data) {
          if (data.isNotEmpty) {
            final driver = data.first;
            if (driver['current_lat'] != null && driver['current_lng'] != null) {
              setState(() {
                _driverLocation = LatLng(
                  (driver['current_lat'] as num).toDouble(),
                  (driver['current_lng'] as num).toDouble(),
                );
              });
              _mapController?.animateCamera(
                CameraUpdate.newLatLng(_driverLocation!),
              );
            }
          }
        });
  }

  @override
  Widget build(BuildContext context) {
    if (_ride == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_ride!.status == RideStatus.accepted 
            ? 'Driver Menuju Lokasi' 
            : 'Sedang Mengantar'),
      ),
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: LatLng(_ride!.pickupLat, _ride!.pickupLng),
              zoom: 15,
            ),
            onMapCreated: (controller) => _mapController = controller,
            markers: {
              if (_driverLocation != null)
                Marker(
                  markerId: const MarkerId('driver'),
                  position: _driverLocation!,
                  icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
                ),
              Marker(
                markerId: const MarkerId('destination'),
                position: LatLng(_ride!.dropoffLat, _ride!.dropoffLng),
              ),
            },
          ),
          
          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.blue.withValues(alpha: 0.1),
                          child: Icon(LucideIcons.car, color: Colors.blue),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Driver sedang di jalan', 
                                  style: TextStyle(color: Colors.grey, fontSize: 12)),
                              Text('Menuju lokasi Anda', 
                                  style: const TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 32),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Tarif Total', style: TextStyle(color: Colors.grey)),
                        Text('Rp ${_ride!.fare.toLocaleString("id-ID")}', 
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

extension NumberFormatExtension on double {
  String toLocaleString(String locale) {
    return toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]}.',
    );
  }
}
