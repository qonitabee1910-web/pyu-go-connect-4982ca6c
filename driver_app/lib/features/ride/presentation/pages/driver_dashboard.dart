import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../../../services/location_service.dart';
import '../../../auth/domain/driver.dart';

final driverProfileProvider = FutureProvider<Driver?>((ref) async {
  final supabase = Supabase.instance.client;
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return null;

  final response = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

  if (response == null) return null;
  return Driver.fromJson(response);
});

final driverStatusProvider = StateProvider<bool>((ref) => false);

class DriverDashboard extends ConsumerStatefulWidget {
  const DriverDashboard({super.key});

  @override
  ConsumerState<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends ConsumerState<DriverDashboard> {
  final LocationService _locationService = LocationService();

  @override
  Widget build(BuildContext context) {
    final driverAsync = ref.watch(driverProfileProvider);
    final isOnline = ref.watch(driverStatusProvider);

    return Scaffold(
      body: driverAsync.when(
        data: (driver) {
          if (driver == null) {
            return const Center(child: Text('Akun driver tidak ditemukan.'));
          }

          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Toggle
                  _buildStatusCard(driver, isOnline),
                  const SizedBox(height: 16),

                  // Stats
                  _buildStatsRow(driver),
                  const SizedBox(height: 16),

                  // Map
                  _buildMapCard(driver),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildStatusCard(Driver driver, bool isOnline) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  driver.fullName,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text(
                  isOnline ? '🟢 Online' : '⚫ Offline',
                  style: TextStyle(
                    color: isOnline ? Colors.green : Colors.grey,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            Switch(
              value: isOnline,
              onChanged: (value) async {
                ref.read(driverStatusProvider.notifier).state = value;
                final newStatus = value ? 'available' : 'offline';
                await Supabase.instance.client
                    .from('drivers')
                    .update({'status': newStatus}).eq('id', driver.id);
                
                if (value) {
                  _locationService.startLocationTracking();
                } else {
                  _locationService.stopLocationTracking();
                }
              },
              activeThumbColor: Colors.green,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow(Driver driver) {
    return Row(
      children: [
        _buildStatCard(LucideIcons.car, '0', 'Rides', Colors.green),
        const SizedBox(width: 8),
        _buildStatCard(
          LucideIcons.dollarSign,
          NumberFormat.currency(locale: 'id_ID', symbol: 'Rp', decimalDigits: 0)
              .format(0),
          'Pendapatan',
          Colors.green,
        ),
        const SizedBox(width: 8),
        _buildStatCard(LucideIcons.star, driver.rating.toStringAsFixed(1), 'Rating', Colors.orange),
      ],
    );
  }

  Widget _buildStatCard(IconData icon, String value, String label, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              Text(
                label,
                style: const TextStyle(fontSize: 8, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMapCard(Driver driver) {
    final position = LatLng(driver.currentLat ?? -7.43, driver.currentLng ?? 109.24);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: SizedBox(
        height: 250,
        child: GoogleMap(
          initialCameraPosition: CameraPosition(target: position, zoom: 14),
          markers: {
            Marker(
              markerId: const MarkerId('driver'),
              position: position,
            ),
          },
          zoomControlsEnabled: false,
          myLocationButtonEnabled: false,
        ),
      ),
    );
  }
}
