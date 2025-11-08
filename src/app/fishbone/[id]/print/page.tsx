'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { getFishboneById } from '@/lib/api/fishbone'
import { getComplaintByComplaintId } from '@/lib/api/complaints'
import { Loader2 } from 'lucide-react'

export default function FishbonePrintPage() {
  const params = useParams()
  const { currentCompany } = useCompany()
  const [fishbone, setFishbone] = useState<any>(null)
  const [complaintPhotos, setComplaintPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fishboneId = params.id as string

  useEffect(() => {
    if (fishboneId) {
      fetchFishboneData()
    }
  }, [fishboneId, currentCompany])

  const fetchFishboneData = async () => {
    try {
      const data = await getFishboneById(parseInt(fishboneId), currentCompany)
      console.log('Fishbone Data:', data)
      console.log('Control Sample Photos:', (data as any).control_sample_photos)
      setFishbone(data)
      
      // Fetch complaint photos if complaint_id exists
      if ((data as any).complaint_id) {
        try {
          const complaintData: any = await getComplaintByComplaintId((data as any).complaint_id, currentCompany)
          console.log('Complaint data:', complaintData)
          if (complaintData.proofImages && Array.isArray(complaintData.proofImages)) {
            setComplaintPhotos(complaintData.proofImages)
            console.log('Complaint photos loaded:', complaintData.proofImages.length)
          }
        } catch (error) {
          console.error('Error fetching complaint photos:', error)
        }
      }
      
      // Auto print after data loads
      setTimeout(() => {
        window.print()
      }, 500)
    } catch (error) {
      console.error('Error fetching Fishbone:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!fishbone) return null

  // Helper function to get non-empty causes
  const getCauses = (causesArray: string[] | null) => {
    if (!causesArray || causesArray.length === 0) return []
    return causesArray.filter(cause => cause && cause.trim() !== '')
  }

  return (
    <div className="print-container">
      <style jsx global>{`
        :root {
          --ink: #111;
          --muted: #555;
          --line: #ddd;
        }
        * { box-sizing: border-box; }
        
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 1.20cm; }
        }
        
        .print-container {
          font-family: "Segoe UI", Roboto, Arial, sans-serif;
          color: var(--ink);
          background: #fff;
          font-size: 10pt;
          line-height: 1.4;
        }

        .hdr {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 20px;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 2px solid var(--ink);
          margin-bottom: 8px;
        }

        .hdr img {
          height: 110px;
          width: auto;
        }

        .logo-box {
          font-weight: 800;
          letter-spacing: 0.8px;
          display: inline-block;
          border: 2px solid var(--ink);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 13px;
        }

        .doc-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          line-height: 1.2;
          margin-top: 8px;
        }

        .brand-tag {
          font-weight: 800;
          letter-spacing: 0.5px;
          font-size: 13px;
          text-align: right;
        }

        .kvs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 10px;
        }

        .kv {
          border: 1px solid var(--line);
          padding: 8px;
          border-radius: 6px;
        }

        .kv label {
          font-size: 9px;
          color: var(--muted);
          display: block;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .kv div {
          font-size: 10px;
          font-weight: 600;
        }

        h3.sec {
          margin: 14px 0 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          font-weight: 700;
          break-after: avoid;
        }

        .box {
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 10px;
          font-size: 10px;
          line-height: 1.5;
          break-inside: avoid;
          min-height: 40px;
        }

        .fishbone-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
        }

        .category-box {
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 10px;
          background-color: #fafafa;
          break-inside: avoid;
        }

        .category-title {
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          color: var(--ink);
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--line);
        }

        .cause-item {
          padding: 6px 8px;
          margin-bottom: 6px;
          background-color: white;
          border-left: 3px solid #2196f3;
          border-radius: 4px;
          font-size: 9px;
        }

        .cause-number {
          font-weight: 700;
          color: #2196f3;
          margin-right: 6px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          break-inside: avoid;
          margin: 8px 0;
        }

        th, td {
          border: 1px solid var(--line);
          padding: 6px 8px;
          font-size: 10px;
          vertical-align: top;
        }

        th {
          background: #fafafa;
          text-align: left;
          font-weight: 700;
        }

        .status {
          font-weight: 700;
        }

        .s-green {
          color: #0a7a3d;
        }

        .s-amber {
          color: #b07900;
        }

        .s-red {
          color: #9f1f15;
        }

        .mt8 {
          margin-top: 8px;
        }

        .muted {
          color: var(--muted);
          font-size: 9px;
        }
      `}</style>

      {/* Header */}
      {/* Header */}
      <header className="hdr">
        <img src="/candor-logo.jpg" alt="Candor Foods Logo" />
        <div>
          <div className="logo-box">CANDOR FOODS PRIVATE LIMITED</div>
          <div className="doc-title mt8">
            Fishbone Analysis And Corrective Actions
          </div>
          <div className="muted">Document No: CFPL.A.C3.F.03A</div>
        </div>
        <div className="brand-tag">CFPL — Quality Analysis</div>
      </header>

      {/* Top Keys */}
      <div className="kvs">
        <div className="kv">
          <label>Analysis Number</label>
          <div>{fishbone.fishbone_number || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Complaint ID</label>
          <div>{fishbone.complaint_id || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Analysis Date</label>
          <div>{fishbone.analysis_date ? new Date(fishbone.analysis_date).toLocaleDateString() : 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Prepared By</label>
          <div>{fishbone.created_by || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Item Category</label>
          <div>{fishbone.item_category || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Item Subcategory</label>
          <div>{fishbone.item_subcategory || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Customer Name</label>
          <div>{fishbone.customer_name || fishbone.other_customer_name || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Date Occurred</label>
          <div>{fishbone.date_occurred ? new Date(fishbone.date_occurred).toLocaleDateString() : 'N/A'}</div>
        </div>
      </div>

      {/* Item Description */}
      <h3 className="sec">Item Description</h3>
      <div className="box">{fishbone.item_description || 'N/A'}</div>

      {/* Problem Statement */}
      <h3 className="sec">Problem Statement / Effect</h3>
      <div className="box">
        {fishbone.problem_statement || 'No problem statement provided'}
      </div>

      {/* Complaint Photos */}
      {complaintPhotos.length > 0 && (
        <>
          <h3 className="sec">Complaint Photos (From Original Complaint)</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '12px'
          }}>
            {complaintPhotos.map((photoUrl, index) => (
              <div key={index} style={{
                position: 'relative',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                overflow: 'hidden',
                aspectRatio: '1'
              }}>
                <img
                  src={photoUrl}
                  alt={`Complaint Photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  fontSize: '8px',
                  padding: '2px 6px',
                  borderRadius: '3px'
                }}>
                  Photo {index + 1}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Fishbone Diagram - 6M Analysis */}
      <h3 className="sec">Root Cause Analysis — 6M Categories</h3>
        
        <div className="fishbone-grid">
          {/* People */}
          <div className="category-box">
            <div className="category-title">PEOPLE (MAN)</div>
            {getCauses(fishbone.people_causes).length > 0 ? (
              getCauses(fishbone.people_causes).map((cause, idx) => (
                <div key={idx} className="cause-item">
                  <span className="cause-number">{idx + 1}.</span>
                  {cause}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '10px' }}>No causes identified</div>
            )}
          </div>

          {/* Process */}
          <div className="category-box">
            <div className="category-title">PROCESS (METHOD)</div>
            {getCauses(fishbone.process_causes).length > 0 ? (
              getCauses(fishbone.process_causes).map((cause, idx) => (
                <div key={idx} className="cause-item">
                  <span className="cause-number">{idx + 1}.</span>
                  {cause}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '10px' }}>No causes identified</div>
            )}
          </div>

          {/* Equipment */}
          <div className="category-box">
            <div className="category-title">EQUIPMENT (MACHINE)</div>
            {getCauses(fishbone.equipment_causes).length > 0 ? (
              getCauses(fishbone.equipment_causes).map((cause, idx) => (
                <div key={idx} className="cause-item">
                  <span className="cause-number">{idx + 1}.</span>
                  {cause}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '10px' }}>No causes identified</div>
            )}
          </div>

          {/* Materials */}
          <div className="category-box">
            <div className="category-title">MATERIALS</div>
            {getCauses(fishbone.materials_causes).length > 0 ? (
              getCauses(fishbone.materials_causes).map((cause, idx) => (
                <div key={idx} className="cause-item">
                  <span className="cause-number">{idx + 1}.</span>
                  {cause}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '10px' }}>No causes identified</div>
            )}
          </div>

          {/* Environment */}
          <div className="category-box">
            <div className="category-title">ENVIRONMENT</div>
            {getCauses(fishbone.environment_causes).length > 0 ? (
              getCauses(fishbone.environment_causes).map((cause, idx) => (
                <div key={idx} className="cause-item">
                  <span className="cause-number">{idx + 1}.</span>
                  {cause}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '10px' }}>No causes identified</div>
            )}
          </div>

          {/* Management */}
          <div className="category-box">
            <div className="category-title">MANAGEMENT (METHODS)</div>
            {getCauses(fishbone.management_causes).length > 0 ? (
              getCauses(fishbone.management_causes).map((cause, idx) => (
                <div key={idx} className="cause-item">
                  <span className="cause-number">{idx + 1}.</span>
                  {cause}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '10px' }}>No causes identified</div>
            )}
          </div>
        </div>

      {/* Action Plan */}
      <h3 className="sec">Corrective Action Plan</h3>
      {fishbone.action_plan && fishbone.action_plan.length > 0 ? (
        <table>
            <thead>
              <tr>
                <th style={{ width: '5%' }}>#</th>
                <th style={{ width: '40%' }}>Corrective Action</th>
                <th style={{ width: '20%' }}>Responsible Person</th>
                <th style={{ width: '15%' }}>Target Date</th>
                <th style={{ width: '20%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {fishbone.action_plan.map((action: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                  <td>{action.action || 'N/A'}</td>
                  <td>{action.responsible || 'N/A'}</td>
                  <td>{action.deadline ? new Date(action.deadline).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${action.status || 'pending'}`}>
                      {(action.status || 'pending').replace('-', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
            No action plan defined
          </div>
        )}

      {/* Preventive Actions */}
      <h3 className="sec">Preventive Actions</h3>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px'}}>
        <div>
          <strong>Complaint Register:</strong>
          <div className="box">{fishbone.prepared_by || 'N/A'}</div>
        </div>
        <div>
          <strong>Verified By:</strong>
          <div className="box">{fishbone.approved_by || 'N/A'}</div>
        </div>
        <div>
          <strong>CAPA Prepared By:</strong>
          <div className="box">{fishbone.capa_prepared_by || 'N/A'}</div>
        </div>
        <div>
          <strong>Date Approved:</strong>
          <div className="box">{fishbone.date_approved || 'N/A'}</div>
        </div>
      </div>

      {/* Evidence Submitted to Customer */}
      {(() => {
        const photos = (fishbone as any).control_sample_photos
        const photoArray = photos 
          ? (typeof photos === 'string' ? JSON.parse(photos) : photos)
          : []
        
        console.log('Rendering photos:', photoArray)
        
        return photoArray && photoArray.length > 0 ? (
          <>
            <h3 className="sec" style={{marginTop: '24px'}}>Evidence Submitted to Customer</h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px'}}>
              {photoArray.map((url: string, index: number) => (
                <div key={index} style={{position: 'relative', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden'}}>
                  <img 
                    src={url} 
                    alt={`Evidence ${index + 1}`}
                    style={{width: '100%', height: '150px', objectFit: 'cover'}}
                    onError={(e) => console.error('Image load error:', url)}
                  />
                  <div style={{position: 'absolute', bottom: '4px', left: '4px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px'}}>
                    Photo {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null
      })()}
    </div>
  )
}
