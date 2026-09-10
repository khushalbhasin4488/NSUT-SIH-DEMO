/// Offline-first sync contract used by the field app.
/// A production build wires this repository to Drift/SQLite.
class PendingSyncOperation {
  final String operationId;
  final String taskId;
  final DateTime deviceUpdatedAt;
  final Map<String, dynamic> payload;

  const PendingSyncOperation({required this.operationId, required this.taskId, required this.deviceUpdatedAt, required this.payload});

  Map<String, dynamic> toJson() => {
    'operationId': operationId,
    'taskId': taskId,
    'deviceUpdatedAt': deviceUpdatedAt.toUtc().toIso8601String(),
    'payload': payload,
  };
}

abstract interface class FieldSyncRepository {
  Future<List<PendingSyncOperation>> pending();
  Future<void> enqueue(PendingSyncOperation operation);
  Future<void> markApplied(String operationId);
  Future<void> markConflict(String operationId, String reason);
}
