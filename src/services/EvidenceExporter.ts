/**
 * Evidence Exporter - Export mission reports and evidence packages
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Mission, Incident, MissionEvent, Snapshot } from '../types/domain';
import { format } from 'date-fns';

export interface EvidencePackage {
  mission: Mission;
  incident: Incident;
  timeline: MissionEvent[];
  snapshots: Snapshot[];
  metadata: {
    exportedAt: number;
    exportedBy: string;
    version: string;
  };
}

export class EvidenceExporter {
  private version: string = '1.0.0';

  /**
   * Export mission as JSON
   */
  exportJSON(evidencePackage: EvidencePackage): string {
    return JSON.stringify(evidencePackage, null, 2);
  }

  /**
   * Download JSON file
   */
  downloadJSON(evidencePackage: EvidencePackage, filename?: string): void {
    const json = this.exportJSON(evidencePackage);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `mission-${evidencePackage.mission.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export mission report as PDF
   */
  exportPDF(
    mission: Mission,
    incident: Incident,
    timeline: MissionEvent[],
    snapshots: Snapshot[] = []
  ): jsPDF {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MISSION REPORT', 105, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Mission ID: ${mission.id}`, 105, yPos, { align: 'center' });
    yPos += 15;

    // Mission Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Mission Summary', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryData = [
      ['Status', mission.status],
      ['Created', format(mission.createdAt, 'yyyy-MM-dd HH:mm:ss')],
      ['Launched', mission.launchedAt ? format(mission.launchedAt, 'yyyy-MM-dd HH:mm:ss') : 'N/A'],
      ['Completed', mission.completedAt ? format(mission.completedAt, 'yyyy-MM-dd HH:mm:ss') : 'N/A'],
      ['Duration', mission.completedAt ? `${Math.round((mission.completedAt - mission.createdAt) / 1000)}s` : 'Ongoing'],
      ['Hub ID', mission.hubId],
      ['Drone ID', mission.droneId],
      ['Created By', mission.createdBy],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 140 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Incident Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Incident Details', 20, yPos);
    yPos += 8;

    const incidentData = [
      ['Type', incident.type],
      ['Severity', incident.severity],
      ['Status', incident.status],
      ['Location', `${incident.position[0].toFixed(6)}, ${incident.position[1].toFixed(6)}`],
      ['Reported', format(incident.timestamp, 'yyyy-MM-dd HH:mm:ss')],
      ['Reported By', incident.reportedBy],
    ];

    if (incident.aiAnalysis) {
      incidentData.push(
        ['People Count', incident.aiAnalysis.peopleCount.toString()],
        ['Injured Count', incident.aiAnalysis.injuredCount.toString()],
        ['Threat Level', `${incident.aiAnalysis.threatLevel}/10`],
        ['Hazards', incident.aiAnalysis.hazards.join(', ')]
      );
    }

    autoTable(doc, {
      startY: yPos,
      body: incidentData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 140 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Route Plan (if available)
    if (mission.routePlan) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Route Plan', 20, yPos);
      yPos += 8;

      const routeData = [
        ['Waypoints', mission.routePlan.waypoints.length.toString()],
        ['Total Distance', `${mission.routePlan.totalDistance.toFixed(2)}m`],
        ['Estimated Duration', `${mission.routePlan.estimatedDuration}s`],
        ['Avoided Geofences', mission.routePlan.avoidedGeofences.length.toString()],
      ];

      autoTable(doc, {
        startY: yPos,
        body: routeData,
        theme: 'grid',
        styles: { fontSize: 9 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40 },
          1: { cellWidth: 140 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Timeline
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Mission Timeline', 20, yPos);
    yPos += 8;

    const timelineData = timeline.map(event => [
      format(event.timestamp, 'HH:mm:ss'),
      event.type,
      event.actor,
      event.description,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Time', 'Event Type', 'Actor', 'Description']],
      body: timelineData,
      theme: 'striped',
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 90 },
      },
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Evidence/Snapshots Summary
    if (snapshots.length > 0) {
      doc.addPage();
      yPos = 20;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Evidence & Snapshots', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total snapshots captured: ${snapshots.length}`, 20, yPos);
      yPos += 8;

      const snapshotData = snapshots.map(snap => [
        format(snap.timestamp, 'HH:mm:ss'),
        snap.isThermal ? 'Thermal' : 'RGB',
        `${snap.position[0].toFixed(6)}, ${snap.position[1].toFixed(6)}`,
        `${snap.altitude.toFixed(1)}m`,
        snap.capturedBy,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Time', 'Type', 'Location', 'Altitude', 'Captured By']],
        body: snapshotData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      });
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Generated by Sky Eye Command Center | ${format(Date.now(), 'yyyy-MM-dd HH:mm:ss')}`,
        105,
        290,
        { align: 'center' }
      );
      doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' });
    }

    return doc;
  }

  /**
   * Download PDF report
   */
  downloadPDF(
    mission: Mission,
    incident: Incident,
    timeline: MissionEvent[],
    snapshots: Snapshot[] = [],
    filename?: string
  ): void {
    const doc = this.exportPDF(mission, incident, timeline, snapshots);
    doc.save(filename || `mission-report-${mission.id}-${Date.now()}.pdf`);
  }

  /**
   * Create complete evidence package
   */
  createEvidencePackage(
    mission: Mission,
    incident: Incident,
    timeline: MissionEvent[],
    snapshots: Snapshot[],
    exportedBy: string
  ): EvidencePackage {
    return {
      mission,
      incident,
      timeline,
      snapshots,
      metadata: {
        exportedAt: Date.now(),
        exportedBy,
        version: this.version,
      },
    };
  }

  /**
   * Export complete evidence package (JSON + PDF)
   */
  exportComplete(
    mission: Mission,
    incident: Incident,
    timeline: MissionEvent[],
    snapshots: Snapshot[],
    exportedBy: string
  ): void {
    const evidencePackage = this.createEvidencePackage(
      mission,
      incident,
      timeline,
      snapshots,
      exportedBy
    );

    // Download JSON
    this.downloadJSON(evidencePackage);

    // Download PDF
    setTimeout(() => {
      this.downloadPDF(mission, incident, timeline, snapshots);
    }, 500); // Slight delay to avoid browser blocking
  }
}

// Export singleton instance
export const evidenceExporter = new EvidenceExporter();
