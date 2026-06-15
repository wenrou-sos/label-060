USE production_tracking;

ALTER TABLE work_orders
  ADD COLUMN defect_threshold DECIMAL(5,2) DEFAULT 5.00 COMMENT '不良率告警阈值(%)，默认5%'
  AFTER total_work_hours;

UPDATE work_orders SET defect_threshold = 5.00 WHERE defect_threshold IS NULL;
