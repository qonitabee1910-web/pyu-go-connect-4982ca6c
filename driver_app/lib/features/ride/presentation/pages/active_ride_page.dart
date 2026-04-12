import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../domain/ride_model.dart';
import '../../domain/ride_repository.dart';

class ActiveRidePage extends StatefulWidget {
  final RideModel ride;
  const ActiveRidePage({super.key, required this.ride});

  @override
  State<ActiveRidePage> createState() => _ActiveRidePageState();
}

class _ActiveRidePageState extends State<ActiveRidePage> {
  final RideRepository _rideRepo = RideRepository();
  late RideStatus _currentStatus;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.ride.status;
  }

  void _launchNavigation(double lat, double lng) async {
    final url = 'google.navigation:q=$lat,$lng&mode=d';
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url));
    }
  }

  Future<void> _updateStatus() async {
    final newStatus = _currentStatus == RideStatus.accepted 
        ? RideStatus.inProgress 
        : RideStatus.completed;

    try {
      if (newStatus == RideStatus.completed) {
        final driverId = Supabase.instance.client.auth.currentUser!.id;
        await _rideRepo.completeRide(widget.ride.id, driverId);
        if (!mounted) return;
        Navigator.pop(context);
      } else {
        await _rideRepo.updateRideStatus(widget.ride.id, newStatus);
        if (!mounted) return;
        setState(() => _currentStatus = newStatus);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final targetLat = _currentStatus == RideStatus.accepted 
        ? widget.ride.pickupLat 
        : widget.ride.dropoffLat;
    final targetLng = _currentStatus == RideStatus.accepted 
        ? widget.ride.pickupLng 
        : widget.ride.dropoffLng;

    return Scaffold(
      appBar: AppBar(
        title: Text(_currentStatus == RideStatus.accepted 
            ? 'Menuju Pickup' 
            : 'Sedang Mengantar'),
      ),
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: LatLng(targetLat, targetLng),
              zoom: 15,
            ),
            markers: {
              Marker(
                markerId: const MarkerId('destination'),
                position: LatLng(targetLat, targetLng),
                infoWindow: InfoWindow(
                  title: _currentStatus == RideStatus.accepted 
                      ? 'Pickup: ${widget.ride.pickupAddress}' 
                      : 'Dropoff: ${widget.ride.dropoffAddress}',
                ),
              ),
            },
          ),
          
          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: Card(
              elevation: 8,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.green.withValues(alpha: 0.1),
                          child: Icon(LucideIcons.user, color: Colors.green),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Customer', style: TextStyle(color: Colors.grey, fontSize: 12)),
                              Text(widget.ride.pickupAddress ?? 'Lokasi Pickup', 
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                  overflow: TextOverflow.ellipsis),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(LucideIcons.navigation, color: Colors.blue),
                          onPressed: () => _launchNavigation(targetLat, targetLng),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _updateStatus,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _currentStatus == RideStatus.accepted ? Colors.blue : Colors.green,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 54),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        _currentStatus == RideStatus.accepted 
                            ? 'SAYA SUDAH SAMPAI' 
                            : 'SELESAIKAN ORDER',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
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
