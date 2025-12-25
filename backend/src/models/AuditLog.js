const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Product actions
      'PRODUCT_CREATE',
      'PRODUCT_UPDATE',
      'PRODUCT_DELETE',
      'PRODUCT_PRICE_CHANGE',
      'PRODUCT_STOCK_UPDATE',
      'PRODUCT_STATUS_CHANGE',
      // Category actions
      'CATEGORY_CREATE',
      'CATEGORY_UPDATE',
      'CATEGORY_DELETE',
      // Order actions
      'ORDER_STATUS_UPDATE',
      'ORDER_CANCEL',
      'ORDER_REFUND_INITIATE',
      'ORDER_REFUND_COMPLETE',
      // Review actions
      'REVIEW_REMOVE',
      // User actions
      'USER_STATUS_CHANGE',
      'ADMIN_CREATE',
    ],
  },
  entityType: {
    type: String,
    required: true,
    enum: ['Product', 'Category', 'Order', 'Review', 'User'],
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  entityName: String, // For easy identification
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  description: String,
  ipAddress: String,
  userAgent: String,
}, {
  timestamps: true,
});

// Indexes
auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to create log
auditLogSchema.statics.log = async function({
  admin,
  action,
  entityType,
  entityId,
  entityName,
  previousValue,
  newValue,
  description,
  ipAddress,
  userAgent,
}) {
  return this.create({
    admin,
    action,
    entityType,
    entityId,
    entityName,
    previousValue,
    newValue,
    description,
    ipAddress,
    userAgent,
  });
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
