export default function softDeletePlugin(schema) {
  // Add fields
  schema.definition.deleted = { type: Boolean, default: false };
  schema.definition.deletedAt = { type: Date, default: null };

  // Add softDelete instance method
  schema.methods.softDelete = async function() {
    this.deleted = true;
    this.deletedAt = new Date();
    return await this.save();
  };

  // Add restore instance method
  schema.methods.restore = async function() {
    this.deleted = false;
    this.deletedAt = null;
    return await this.save();
  };
}
