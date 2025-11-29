'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { getRCAById } from '@/lib/api/rca'
import { getComplaintByComplaintId } from '@/lib/api/complaints'
import { Loader2 } from 'lucide-react'

export default function RCAPrintPage() {
  const params = useParams()
  const { currentCompany } = useCompany()
  const [rca, setRca] = useState<any>(null)
  const [complaintPhotos, setComplaintPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const rcaId = params.id as string

  useEffect(() => {
    if (rcaId) {
      fetchRCAData()
    }
  }, [rcaId, currentCompany])

  const fetchRCAData = async () => {
    try {
      const data = await getRCAById(parseInt(rcaId), currentCompany)
      console.log('RCA Data:', data)
      console.log('Control Sample Photos:', (data as any).control_sample_photos)
      setRca(data)
      
      // Fetch complaint photos if complaint_id exists
      if ((data as any).complaint_id) {
        try {
          const complaintData: any = await getComplaintByComplaintId((data as any).complaint_id, currentCompany)
          console.log('Complaint data:', complaintData)
          if (complaintData.proofImages && Array.isArray(complaintData.proofImages)) {
            // Remove duplicates using Set
            const originalCount = complaintData.proofImages.length
            const uniqueImages = [...new Set(complaintData.proofImages)]
            setComplaintPhotos(uniqueImages)
            console.log(`RCA Print - Deduplicated complaint photos: ${originalCount} → ${uniqueImages.length}`)
          }
        } catch (error) {
          console.error('Error fetching complaint photos:', error)
        }
      }
      
      setTimeout(() => {
        window.print()
      }, 500)
    } catch (error) {
      console.error('Error fetching RCA:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusClass = (status: string) => {
    if (!status) return 's-amber'
    const s = status.toLowerCase()
    if (s.includes('complet')) return 's-green'
    if (s.includes('progress') || s.includes('schedule')) return 's-amber'
    return 's-red'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!rca) return null

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
          padding-bottom: 12px;
          border-bottom: 2px solid var(--ink);
          margin-bottom: 12px;
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

        .row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .full {
          grid-column: 1 / -1;
        }

        .field {
          border: 1px solid var(--line);
          border-radius: 6px;
          padding: 8px;
        }

        .field label {
          font-size: 9px;
          color: var(--muted);
          display: block;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .field div {
          font-size: 10px;
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

        .pill {
          display: inline-block;
          font-size: 9px;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #f6f6f6;
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
      <header className="hdr">
        <img src="/candor-logo.jpg" alt="Candor Foods Logo" />
        <div>
          <div className="logo-box">CANDOR FOODS PRIVATE LIMITED</div>
          <div className="doc-title mt8">
            ROOT CAUSE ANALYSIS & CORRECTIVE/PREVENTIVE ACTIONS
          </div>
          <div className="muted">Document No: CFPL.A.C3.F.03a</div>
        </div>
        <div className="brand-tag">CFPL — Quality & Compliance</div>
      </header>

      {/* Top Keys */}
      <div className="kvs">
        <div className="kv">
          <label>RCA Number</label>
          <div>{rca.rca_number || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Complaint ID</label>
          <div>{rca.complaint_id || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Date of Report</label>
          <div>{rca.date_of_report || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Severity</label>
          <div>{rca.severity?.toUpperCase() || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Customer Name</label>
          <div>{rca.name_of_customer || 'N/A'}</div>
        </div>
        <div className="kv">
          <label>Phone</label>
          <div>{rca.phone_no_of_customer || '-'}</div>
        </div>
        <div className="kv">
          <label>Email</label>
          <div>{rca.email_of_customer || '-'}</div>
        </div>
        <div className="kv">
          <label>Batch Code</label>
          <div>{rca.batch_code || 'N/A'}</div>
        </div>
      </div>

      {/* Summary */}
      <h3 className="sec">Summary of Incident / Nature of Complaint</h3>
      <div className="box">{rca.summary_of_incident || 'N/A'}</div>

      {/* Item Details */}
      <h3 className="sec">Item Information</h3>
      <div className="row">
        <div className="field">
          <label>Item Category</label>
          <div>{rca.item_category || 'N/A'}</div>
        </div>
        <div className="field">
          <label>Item Subcategory</label>
          <div>{rca.item_subcategory || 'N/A'}</div>
        </div>
        <div className="field full">
          <label>Item Description</label>
          <div>{rca.item_description || 'N/A'}</div>
        </div>
      </div>

      {/* Problem Statement */}
      <h3 className="sec">Problem Statement</h3>
      <div className="box">{rca.problem_statement || 'N/A'}</div>

      {/* Complaint Photos */}
      {complaintPhotos.length > 0 && (
        <>
          <h3 className="sec">PICTORIAL EVIDENCE OF THE COMPLAINT</h3>
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

      {/* 5 Whys */}
      <h3 className="sec">Root Cause Analysis — 5 Whys</h3>
      <table>
        <thead>
          <tr>
            <th style={{width: '32px'}}>#</th>
            <th>Immediate/Further Problem Statement</th>
            <th>Cause Category</th>
            <th>Cause Detail</th>
            <th style={{width: '80px'}}>Standard Exists?</th>
            <th style={{width: '80px'}}>Applied?</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((num) => {
            const hasWhy = rca[`why${num}`];
            if (!hasWhy) return null;
            
            return (
              <tr key={num}>
                <td style={{textAlign: 'center', fontWeight: '700'}}>{num}</td>
                <td>{rca[`why${num}`]}</td>
                <td>
                  <span className="pill">{rca[`why${num}_cause_category`] || '-'}</span>
                </td>
                <td>{rca[`why${num}_cause_details`] || '-'}</td>
                <td style={{textAlign: 'center'}}>{rca[`why${num}_standard_exists`]?.toUpperCase() || '-'}</td>
                <td style={{textAlign: 'center'}}>{rca[`why${num}_applied`]?.toUpperCase() || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Root Cause */}
      <h3 className="sec">Root Cause Description (resulting from 5 Whys)</h3>
      <div className="box">{rca.root_cause_description || 'N/A'}</div>

      {/* Corrective Actions */}
      {rca.action_plan && rca.action_plan.length > 0 && (
        <>
          <h3 className="sec">Corrective Action Plan</h3>
          <table>
            <thead>
              <tr>
                <th style={{width: '28px'}}>Sr.</th>
                <th>Challenges / Gaps</th>
                <th>Action Points for Improvements</th>
                <th>Responsibility</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              {(typeof rca.action_plan === 'string' ? JSON.parse(rca.action_plan) : rca.action_plan).map((action: any, index: number) => (
                <tr key={index}>
                  <td style={{textAlign: 'center'}}>{action.srNo || index + 1}</td>
                  <td>{action.challenges || '-'}</td>
                  <td>{action.actionPoints || '-'}</td>
                  <td>{action.responsibility || '-'}</td>
                  <td className={`status ${getStatusClass(action.trafficLightStatus)}`}>
                    {action.trafficLightStatus === 'completed' ? 'COMPLETED' : 
                     action.trafficLightStatus === 'on_schedule' ? 'ON SCHEDULE' : 
                     action.trafficLightStatus === 'delayed' ? 'DELAYED' : 'PENDING'}
                  </td>
                  <td>{action.startDate || '-'}</td>
                  <td>{action.completionDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Preventive Actions */}
      {rca.action_plan && rca.action_plan.length > 0 && (
        <>
          <h3 className="sec">Preventive Action Plan</h3>
          <table>
            <thead>
              <tr>
                <th style={{width: '28px'}}>Sr.</th>
                <th>Future Challenges / Risk Areas</th>
                <th>Preventive Actions</th>
                <th>Responsibility</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              {(typeof rca.action_plan === 'string' ? JSON.parse(rca.action_plan) : rca.action_plan).map((action: any, index: number) => (
                <tr key={index}>
                  <td style={{textAlign: 'center'}}>{action.srNo || index + 1}</td>
                  <td>{action.challenges || '-'}</td>
                  <td>{action.actionPoints || '-'}</td>
                  <td>{action.responsibility || '-'}</td>
                  <td className={`status ${getStatusClass(action.trafficLightStatus)}`}>
                    {action.trafficLightStatus === 'completed' ? 'COMPLETED' : 
                     action.trafficLightStatus === 'on_schedule' ? 'ON SCHEDULE' : 
                     action.trafficLightStatus === 'delayed' ? 'DELAYED' : 'PENDING'}
                  </td>
                  <td>{action.startDate || '-'}</td>
                  <td>{action.completionDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Control Sample Evidence */}
      {(() => {
        const photos = rca.control_sample_photos
        const photoArray = photos 
          ? (typeof photos === 'string' ? JSON.parse(photos) : photos)
          : []
        
        console.log('Rendering photos:', photoArray)
        
        return photoArray && photoArray.length > 0 ? (
          <>
            <h3 className="sec" style={{marginTop: '24px'}}>Control Sample Evidence</h3>
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

      {/* Verified and Approval By */}
      <h3 className="sec">Verified and Approval By</h3>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px'}}>
        <div>
          <strong>Complaint Register:</strong>
          <div className="box">{rca.prepared_by || 'N/A'}</div>
        </div>
        <div>
          <strong>Verified By:</strong>
          <div className="box">{rca.approved_by || 'N/A'}</div>
        </div>
        <div>
          <strong>CAPA Prepared By:</strong>
          <div className="box">{rca.capa_prepared_by || 'N/A'}</div>
        </div>
        <div>
          <strong>Date Approved:</strong>
          <div className="box">{rca.date_approved || 'N/A'}</div>
        </div>
      </div>
    </div>
  )
}
