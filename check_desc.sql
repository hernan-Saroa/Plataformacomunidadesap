-- Ver descripciones actuales de los roles OCIG
SELECT id, name, description, category, type 
FROM auth.role 
WHERE category IN ('backoffice', 'Control Interno', 'sistema')
ORDER BY name;
