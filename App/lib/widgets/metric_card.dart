import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:dashboard_unc/constants/app_colors.dart';
import 'package:dashboard_unc/models/metric_config.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class MetricCard extends StatelessWidget {
  final MetricConfig config;
  final DataPoint? lastData;
  final VoidCallback onTap;

  const MetricCard({
    super.key,
    required this.config,
    required this.lastData,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final valueStr = lastData != null ? lastData!.value.toStringAsFixed(1) : "--";
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: config.color.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(PhosphorIcons.chartLineUp(), color: config.color),
                Icon(Icons.chevron_right, color: Colors.grey[300]),
              ],
            ),
            const SizedBox(height: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(config.name, style: GoogleFonts.poppins(color: AppColors.textSecondary, fontSize: 14)),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(valueStr, style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                    const SizedBox(width: 4),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(config.unit, style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textSecondary)),
                    ),
                  ],
                )
              ],
            )
          ],
        ),
      ),
    );
  }
}