const fs = require('fs');
const path = require('path');
const dir = path.join('C:/Users/Tomas/Documents/ESAP/temporal/Plataformacomunidadesap/backend/academic-work-plan-service/src/pta/entities');
const files = fs.readdirSync(dir);

for (const file of files) {
  if (file.endsWith('.entity.ts')) {
    const filePath = path.join(dir, file);
    let code = fs.readFileSync(filePath, 'utf8');
    
    let changed = false;
    
    if (code.includes('CreateDateColumn') || code.includes('UpdateDateColumn')) {
      
      // Ensure BeforeInsert, BeforeUpdate are imported
      if (!code.includes('BeforeInsert')) {
        code = code.replace(/import \{([^}]*)\} from 'typeorm';/, "import { $1, BeforeInsert, BeforeUpdate } from 'typeorm';");
      }
      
      // Fix duplicate imports
      code = code.replace(/BeforeInsert, BeforeInsert/g, 'BeforeInsert');
      code = code.replace(/BeforeUpdate, BeforeUpdate/g, 'BeforeUpdate');

      // Replace Date Columns
      code = code.replace(/@CreateDateColumn\([^\)]*\)\s*createdAt:\s*Date;/g, "@Column({ name: 'createdAt', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })\n  createdAt: Date;");
      code = code.replace(/@UpdateDateColumn\([^\)]*\)\s*updatedAt:\s*Date;/g, "@Column({ name: 'updatedAt', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })\n  updatedAt: Date;");

      // Add hooks
      if (!code.includes('setTimestamps(')) {
        code = code.replace(/}\s*$/, `
  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
`);
      }
      
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(filePath, code);
      console.log('Fixed TypeORM dates in:', file);
    }
  }
}
